import React, { useState } from 'react';
import { API_BASE_URL } from '../../config';
import { FileSpreadsheet, UploadCloud, AlertCircle, CheckCircle } from 'lucide-react';

const BatchRegistration: React.FC = () => {
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [uploadStatus, setUploadStatus] = useState<string | null>(null);

    const handleBulkUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!csvFile) return;

        const formData = new FormData();
        formData.append('file', csvFile);

        try {
            setUploadStatus('Processing Batch...');
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/bulk-upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            const data = await res.json();
            setUploadStatus(`Upload Complete. Processed: ${data.total_processed}, Success: ${data.successful}, Failed: ${data.failed}`);
            setCsvFile(null);
        } catch (err) {
            setUploadStatus('Upload Failed.');
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-stone-900/80 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-stone-800 animate-in fade-in duration-500">
            <h2 className="text-xl font-bold text-stone-200 mb-2 flex items-center space-x-2">
                <FileSpreadsheet className="w-6 h-6 text-yellow-500" />
                <span>Bulk Agniveer Registration</span>
            </h2>
            <div className="flex justify-between items-start mb-8">
                <p className="text-sm text-stone-500 max-w-md">Upload a CSV file containing batch details. Ensure the format matches the standard schema (Batch No, Service ID, Name, etc.).</p>
                <a
                    href={`${API_BASE_URL}/uploads/agniveer_batch_template.csv`}
                    download="batch_template.csv"
                    className="flex items-center space-x-2 text-yellow-500 font-bold text-xs border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 rounded-lg hover:bg-yellow-500/20 transition-all"
                >
                    <UploadCloud className="w-4 h-4" />
                    <span>Download Template</span>
                </a>
            </div>

            <form onSubmit={handleBulkUpload} className="space-y-6">
                <div className="border-2 border-dashed border-stone-700 rounded-2xl p-12 text-center hover:bg-stone-800/50 hover:border-yellow-500/50 transition-all group">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="csvUpload"
                    />
                    <label htmlFor="csvUpload" className="cursor-pointer flex flex-col items-center">
                        <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-stone-700 transition-colors">
                            <UploadCloud className="w-8 h-8 text-stone-400 group-hover:text-yellow-500 transition-colors" />
                        </div>
                        <span className="font-bold text-stone-300 text-lg group-hover:text-yellow-500 transition-colors">
                            {csvFile ? csvFile.name : 'Click to Upload CSV'}
                        </span>
                        <span className="text-xs text-stone-500 mt-2">Maximum file size: 5MB</span>
                    </label>
                </div>

                {uploadStatus && (
                    <div className={`p-4 rounded-xl text-sm font-bold text-center border flex items-center justify-center space-x-2 ${uploadStatus.includes('Failed') ? 'bg-red-900/20 text-red-400 border-red-900/50' : 'bg-teal-900/20 text-teal-400 border-teal-900/50'}`}>
                        {uploadStatus.includes('Failed') ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        <span>{uploadStatus}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={!csvFile}
                    className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 disabled:from-stone-800 disabled:to-stone-800 disabled:text-stone-600 disabled:cursor-not-allowed text-stone-900 font-bold py-4 rounded-xl shadow-lg transition-all uppercase tracking-widest text-sm"
                >
                    Process Batch Data
                </button>
            </form>
        </div>
    );
};

export default BatchRegistration;
