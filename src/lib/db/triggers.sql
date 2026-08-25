-- ==============================================================================
-- CAMPUS SUPPLY RESCUE & REDISTRIBUTION SYSTEM
-- DATABASE TRIGGERS & INTEGRITY FUNCTIONS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TRIGGER: Supply Status History Tracking
-- Automatically logs historical state changes for any supply into supply_status_history
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_supply_status_history()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO supply_status_history (
            supply_id,
            old_status,
            new_status,
            changed_by_user_id,
            change_reason,
            created_at
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.created_by_user_id,
            format('Automated status transition: %s -> %s', COALESCE(OLD.status, 'INITIAL'), NEW.status),
            CURRENT_TIMESTAMP
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_supply_status_history ON supplies;
CREATE TRIGGER trg_supply_status_history
AFTER UPDATE ON supplies
FOR EACH ROW
EXECUTE FUNCTION fn_trg_supply_status_history();


-- ------------------------------------------------------------------------------
-- 2. TRIGGER: Audit Trail for Supply Allocations
-- Automatically creates security audit records when allocations are created or updated
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_audit_allocations()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (
            user_id,
            action,
            entity_type,
            entity_id,
            details,
            created_at
        ) VALUES (
            NEW.reserved_by_user_id,
            'CREATE_ALLOCATION',
            'supply_allocations',
            NEW.id,
            jsonb_build_object(
                'supply_id', NEW.supply_id,
                'request_id', NEW.request_id,
                'allocated_quantity', NEW.allocated_quantity,
                'status', NEW.allocation_status
            ),
            CURRENT_TIMESTAMP
        );
    ELSIF (TG_OP = 'UPDATE' AND OLD.allocation_status IS DISTINCT FROM NEW.allocation_status) THEN
        INSERT INTO audit_logs (
            user_id,
            action,
            entity_type,
            entity_id,
            details,
            created_at
        ) VALUES (
            NEW.reserved_by_user_id,
            'UPDATE_ALLOCATION_STATUS',
            'supply_allocations',
            NEW.id,
            jsonb_build_object(
                'old_status', OLD.allocation_status,
                'new_status', NEW.allocation_status,
                'allocated_quantity', NEW.allocated_quantity
            ),
            CURRENT_TIMESTAMP
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_allocations ON supply_allocations;
CREATE TRIGGER trg_audit_allocations
AFTER INSERT OR UPDATE ON supply_allocations
FOR EACH ROW
EXECUTE FUNCTION fn_trg_audit_allocations();


-- ------------------------------------------------------------------------------
-- 3. TRIGGER: Quantity Invariant Integrity Guard
-- Ensures that available + reserved + transferred_out strictly equals total quantity
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_check_quantity_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF (NEW.quantity_available + NEW.quantity_reserved + NEW.quantity_transferred_out) != NEW.quantity_total THEN
        RAISE EXCEPTION 'Quantity Invariant Violation on supply #%: total (%) != available (%) + reserved (%) + transferred_out (%)',
            NEW.id, NEW.quantity_total, NEW.quantity_available, NEW.quantity_reserved, NEW.quantity_transferred_out;
    END IF;

    IF NEW.quantity_available < 0 OR NEW.quantity_reserved < 0 OR NEW.quantity_transferred_out < 0 THEN
        RAISE EXCEPTION 'Quantity Invariant Violation: Negative quantities are strictly disallowed.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_quantity_integrity ON supplies;
CREATE TRIGGER trg_check_quantity_integrity
BEFORE INSERT OR UPDATE ON supplies
FOR EACH ROW
EXECUTE FUNCTION fn_trg_check_quantity_integrity();
