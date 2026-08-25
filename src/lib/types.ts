export type UserRole = 'ADMIN' | 'DEPARTMENT_STAFF';

export type SupplyCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR';

export type SupplyStatus = 
  | 'AVAILABLE' 
  | 'PARTIALLY_RESERVED' 
  | 'FULLY_RESERVED' 
  | 'TRANSFERRED' 
  | 'WITHDRAWN' 
  | 'EXPIRED';

export type RequestStatus = 
  | 'OPEN' 
  | 'PARTIALLY_FULFILLED' 
  | 'FULFILLED' 
  | 'CANCELLED';

export type RequestUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type AllocationStatus = 'RESERVED' | 'HANDED_OVER' | 'CANCELLED';

export type RescueEventType = 
  | 'LISTED' 
  | 'REQUESTED' 
  | 'RESERVED' 
  | 'HANDED_OVER' 
  | 'RECEIVED' 
  | 'REDISTRIBUTED' 
  | 'WITHDRAWN' 
  | 'EXPIRED';

export interface Department {
  id: number;
  name: string;
  code: string;
  building: string;
  contact_email: string;
  phone?: string | null;
  created_at: string;
}

export interface User {
  id: number;
  department_id: number;
  department_name?: string;
  department_code?: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SupplyCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon_name: string;
}

export interface Supply {
  id: number;
  department_id: number;
  department_name?: string;
  department_code?: string;
  department_building?: string;
  created_by_user_id: number;
  contributor_name?: string;
  contributor_email?: string;
  contributor_phone?: string;
  category_id: number;
  category_name?: string;
  category_slug?: string;
  category_icon?: string;
  title: string;
  description: string;
  quantity_total: number;
  quantity_available: number;
  quantity_reserved: number;
  quantity_transferred_out: number;
  condition: SupplyCondition;
  location_details: string;
  estimated_replacement_value?: number | null;
  availability_until?: string | null;
  status: SupplyStatus;
  similarity_score?: number;
  created_at: string;
  updated_at: string;
}

export interface SupplyRequest {
  id: number;
  requesting_department_id: number;
  requesting_department_name?: string;
  requesting_department_code?: string;
  requesting_department_building?: string;
  requested_by_user_id: number;
  requester_name?: string;
  purpose_description: string;
  requested_quantity: number;
  fulfilled_quantity: number;
  urgency: RequestUrgency;
  preferred_category_id?: number | null;
  preferred_category_name?: string | null;
  preferred_category_icon?: string | null;
  status: RequestStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplyAllocation {
  id: number;
  request_id: number;
  supply_id: number;
  supply_title?: string;
  supply_condition?: string;
  supply_location?: string;
  supply_current_available?: number;
  supply_current_reserved?: number;
  source_department_id?: number;
  source_department_name?: string;
  source_department_code?: string;
  receiving_department_id?: number;
  receiving_department_name?: string;
  receiving_department_code?: string;
  allocated_quantity: number;
  allocation_status: AllocationStatus;
  reserved_at: string;
  reserved_by_user_id: number;
  reserved_by_name?: string;
  request_purpose?: string;
  request_urgency?: string;
  completed_at?: string | null;
  created_at: string;
}

export interface Transfer {
  id: number;
  allocation_id: number;
  supply_id: number;
  supply_title?: string;
  source_department_id: number;
  source_department_name?: string;
  receiving_department_id: number;
  receiving_department_name?: string;
  quantity: number;
  initiated_by_user_id: number;
  completed_by_user_id?: number | null;
  handover_timestamp: string;
  handover_notes?: string | null;
  created_at: string;
}

export interface RescueChainEvent {
  id: number;
  supply_id: number;
  supply_title?: string;
  allocation_id?: number | null;
  transfer_id?: number | null;
  from_department_id: number;
  from_department_name?: string;
  from_department_code?: string;
  to_department_id: number;
  to_department_name?: string;
  to_department_code?: string;
  quantity: number;
  event_type: RescueEventType;
  notes?: string | null;
  user_id: number;
  user_name?: string;
  actor_name?: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id?: number | null;
  user_name?: string | null;
  user_email?: string | null;
  user_role?: string | null;
  department_name?: string | null;
  action: string;
  entity_type: string;
  entity_id?: number | null;
  details?: Record<string, any> | null;
  ip_address?: string | null;
  created_at: string;
}

export interface DepartmentRescueStats {
  department_id: number;
  department_name: string;
  department_code: string;
  building: string;
  total_supplies_listed: number;
  total_units_listed: number;
  total_units_transferred_out: number;
  total_units_received: number;
  estimated_avoided_procurement_value: number;
}

export interface CategorySurplusAnalysis {
  category_id: number;
  category_name: string;
  category_slug: string;
  category_icon: string;
  active_listings_count: number;
  current_available_units: number;
  total_rescued_units: number;
  open_requests_count: number;
}

export interface AuthSession {
  user: {
    id: number;
    email: string;
    full_name: string;
    role: UserRole;
    department_id: number;
    department_name: string;
    department_code: string;
  };
}
