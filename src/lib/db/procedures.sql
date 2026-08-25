-- ==============================================================================
-- CAMPUS SUPPLY RESCUE & REDISTRIBUTION SYSTEM
-- STORED FUNCTIONS & PROCEDURES (PL/pgSQL)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. sp_reserve_supply
-- Atomically reserves a requested quantity of a surplus supply for a request.
-- Uses row-level locking (SELECT ... FOR UPDATE) to prevent race conditions.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sp_reserve_supply(
    p_request_id INTEGER,
    p_supply_id INTEGER,
    p_quantity INTEGER,
    p_user_id INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_req_status VARCHAR(30);
    v_req_qty INTEGER;
    v_req_fulfilled INTEGER;
    v_req_dept_id INTEGER;
    v_sup_status VARCHAR(30);
    v_sup_available INTEGER;
    v_sup_dept_id INTEGER;
    v_allocation_id INTEGER;
    v_new_sup_status VARCHAR(30);
    v_new_req_status VARCHAR(30);
BEGIN
    -- Validate quantity parameter
    IF p_quantity <= 0 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Allocation quantity must be greater than zero.'
        );
    END IF;

    -- 1. Lock and validate the supply record
    SELECT status, quantity_available, department_id
    INTO v_sup_status, v_sup_available, v_sup_dept_id
    FROM supplies
    WHERE id = p_supply_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Supply listing #%s not found.', p_supply_id)
        );
    END IF;

    IF v_sup_status NOT IN ('AVAILABLE', 'PARTIALLY_RESERVED') THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Supply cannot be reserved because its current status is %s.', v_sup_status)
        );
    END IF;

    IF v_sup_available < p_quantity THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Insufficient available quantity. Requested: %s, Available in stock: %s.', p_quantity, v_sup_available)
        );
    END IF;

    -- 2. Lock and validate the request record
    SELECT status, requested_quantity, fulfilled_quantity, requesting_department_id
    INTO v_req_status, v_req_qty, v_req_fulfilled, v_req_dept_id
    FROM supply_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Supply request #%s not found.', p_request_id)
        );
    END IF;

    IF v_req_status IN ('FULFILLED', 'CANCELLED') THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Request cannot accept reservations because status is %s.', v_req_status)
        );
    END IF;

    IF (v_req_fulfilled + p_quantity) > v_req_qty THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Reservation of %s units would exceed the unfulfilled request need (%s remaining).', 
                p_quantity, (v_req_qty - v_req_fulfilled))
        );
    END IF;

    -- Compute new supply status
    IF (v_sup_available - p_quantity) = 0 THEN
        v_new_sup_status := 'FULLY_RESERVED';
    ELSE
        v_new_sup_status := 'PARTIALLY_RESERVED';
    END IF;

    -- 3. Update supply quantities
    UPDATE supplies
    SET quantity_available = quantity_available - p_quantity,
        quantity_reserved = quantity_reserved + p_quantity,
        status = v_new_sup_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_supply_id;

    -- 4. Create the supply allocation record
    INSERT INTO supply_allocations (
        request_id,
        supply_id,
        allocated_quantity,
        allocation_status,
        reserved_by_user_id
    ) VALUES (
        p_request_id,
        p_supply_id,
        p_quantity,
        'RESERVED',
        p_user_id
    ) RETURNING id INTO v_allocation_id;

    -- Compute new request status
    IF (v_req_fulfilled + p_quantity) >= v_req_qty THEN
        v_new_req_status := 'FULFILLED';
    ELSE
        v_new_req_status := 'PARTIALLY_FULFILLED';
    END IF;

    -- 5. Update request status & fulfilled count
    UPDATE supply_requests
    SET fulfilled_quantity = fulfilled_quantity + p_quantity,
        status = v_new_req_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_request_id;

    -- 6. Record the event into the Rescue Chain timeline
    INSERT INTO rescue_chain_events (
        supply_id,
        allocation_id,
        from_department_id,
        to_department_id,
        quantity,
        event_type,
        notes,
        user_id
    ) VALUES (
        p_supply_id,
        v_allocation_id,
        v_sup_dept_id,
        v_req_dept_id,
        p_quantity,
        'RESERVED',
        format('Reserved %s units for Request #%s', p_quantity, p_request_id),
        p_user_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'allocation_id', v_allocation_id,
        'supply_id', p_supply_id,
        'request_id', p_request_id,
        'allocated_quantity', p_quantity,
        'supply_new_status', v_new_sup_status,
        'request_new_status', v_new_req_status,
        'message', format('Successfully reserved %s units for request #%s.', p_quantity, p_request_id)
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. sp_complete_handover
-- Atomically confirms physical transfer of reserved supplies.
-- Moves quantities from reserved to transferred_out, records transfer,
-- and logs completion in the Rescue Chain.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sp_complete_handover(
    p_allocation_id INTEGER,
    p_completed_by_user_id INTEGER,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_alloc_status VARCHAR(30);
    v_alloc_qty INTEGER;
    v_supply_id INTEGER;
    v_req_id INTEGER;
    v_src_dept_id INTEGER;
    v_recv_dept_id INTEGER;
    v_transfer_id INTEGER;
    v_curr_avail INTEGER;
    v_curr_res INTEGER;
    v_new_status VARCHAR(30);
BEGIN
    -- 1. Lock and inspect allocation
    SELECT a.allocation_status, a.allocated_quantity, a.supply_id, a.request_id,
           s.department_id, r.requesting_department_id, s.quantity_available, s.quantity_reserved
    INTO v_alloc_status, v_alloc_qty, v_supply_id, v_req_id,
         v_src_dept_id, v_recv_dept_id, v_curr_avail, v_curr_res
    FROM supply_allocations a
    JOIN supplies s ON a.supply_id = s.id
    JOIN supply_requests r ON a.request_id = r.id
    WHERE a.id = p_allocation_id
    FOR UPDATE OF a, s;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Allocation #%s not found.', p_allocation_id)
        );
    END IF;

    IF v_alloc_status != 'RESERVED' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Cannot complete handover because allocation status is already %s.', v_alloc_status)
        );
    END IF;

    -- Calculate new supply status
    IF v_curr_avail = 0 AND (v_curr_res - v_alloc_qty) = 0 THEN
        v_new_status := 'TRANSFERRED';
    ELSIF v_curr_avail > 0 AND (v_curr_res - v_alloc_qty) > 0 THEN
        v_new_status := 'PARTIALLY_RESERVED';
    ELSIF v_curr_avail > 0 AND (v_curr_res - v_alloc_qty) = 0 THEN
        v_new_status := 'AVAILABLE';
    ELSE
        v_new_status := 'TRANSFERRED';
    END IF;

    -- 2. Update supply quantities
    UPDATE supplies
    SET quantity_reserved = quantity_reserved - v_alloc_qty,
        quantity_transferred_out = quantity_transferred_out + v_alloc_qty,
        status = v_new_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_supply_id;

    -- 3. Update allocation status
    UPDATE supply_allocations
    SET allocation_status = 'HANDED_OVER',
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_allocation_id;

    -- 4. Insert into transfers table
    INSERT INTO transfers (
        allocation_id,
        supply_id,
        source_department_id,
        receiving_department_id,
        quantity,
        initiated_by_user_id,
        completed_by_user_id,
        handover_notes
    ) VALUES (
        p_allocation_id,
        v_supply_id,
        v_src_dept_id,
        v_recv_dept_id,
        v_alloc_qty,
        p_completed_by_user_id,
        p_completed_by_user_id,
        p_notes
    ) RETURNING id INTO v_transfer_id;

    -- 5. Record Handover in Rescue Chain
    INSERT INTO rescue_chain_events (
        supply_id,
        allocation_id,
        transfer_id,
        from_department_id,
        to_department_id,
        quantity,
        event_type,
        notes,
        user_id
    ) VALUES (
        v_supply_id,
        p_allocation_id,
        v_transfer_id,
        v_src_dept_id,
        v_recv_dept_id,
        v_alloc_qty,
        'HANDED_OVER',
        COALESCE(p_notes, format('Handed over %s units from Dept %s to Dept %s', v_alloc_qty, v_src_dept_id, v_recv_dept_id)),
        p_completed_by_user_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'transfer_id', v_transfer_id,
        'allocation_id', p_allocation_id,
        'supply_id', v_supply_id,
        'transferred_quantity', v_alloc_qty,
        'supply_new_status', v_new_status,
        'message', format('Successfully completed physical handover of %s units.', v_alloc_qty)
    );
END;
$$;
