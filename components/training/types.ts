export interface ScheduledTest {
    id: number;
    name: string;
    test_type: string;
    description?: string;
    scheduled_date: string;
    end_time?: string;
    location?: string;
    target_type: string;
    target_value?: string;
    instructor?: string;
    max_marks: number;
    passing_marks: number;
    created_at: string;
    status: string;
    results_count: number;
}

export interface TestAgniveer {
    id: number;
    service_id: string;
    name: string;
    batch_no?: string;
    company?: string;
    score: number | null;
    is_absent: boolean;
    has_result: boolean;
}
