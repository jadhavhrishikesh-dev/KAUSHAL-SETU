import { User, AgniveerProfile } from '../../types';

export interface RRIResponse {
    rri_score: number;
    retention_band: string;
    technical: {
        breakdown: { firing: number; weapon: number; tactical: number; cognitive: number; };
        total_score: number;
    };
}

export interface LeaveRequest {
    id: number;
    start_date: string;
    end_date: string;
    reason?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    leave_type: string;
}

export interface Grievance {
    id: number;
    submitted_at: string;
    addressed_to: string;
    type: string;
    description: string;
    status: 'OPEN' | 'RESOLVED' | 'PENDING';
    resolution_notes?: string;
}
