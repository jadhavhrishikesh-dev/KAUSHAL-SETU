
export const formatDate = (dateString: string | Date | undefined | null): string => {
    if (!dateString) return 'N/A';

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
    } catch (error) {
        return 'Invalid Date';
    }
};

export const formatDateTime = (dateString: string | Date | undefined | null): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        return `${day}-${month}-${year} ${hours}:${minutes}`;
    } catch {
        return 'Invalid Date';
    }
};
