import React, { useState } from 'react';
import { Eye, Upload, CheckCircle, AlertTriangle, X, Sparkles } from 'lucide-react';
import { verifyOCR } from '../api';

export default function OCRUploadModal({ isOpen, onClose }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunOCR = async () => {
    if (!previewUrl) return;
    setLoading(true);
    try {
      const res = await verifyOCR(previewUrl, selectedFile?.name || "Banner Creative");
      setOcrResult(res);
    } catch (err) {
      alert("OCR verification error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Eye className="text-sky-400" size={20} />
            <h3 className="text-base font-bold text-white">
              On-Premise OCR & Visual Claim Verification
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Upload marketing banners, infographics, or ad mockups. Tesseract & OpenCV extract embedded text and claims entirely on-premise without sending images to third-party APIs.
        </p>

        {/* Upload Dropzone */}
        <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-sky-500 transition cursor-pointer bg-slate-950/50">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="ocrFileInput"
          />
          <label htmlFor="ocrFileInput" className="cursor-pointer space-y-2 block">
            <Upload className="mx-auto text-slate-400" size={28} />
            <div className="text-xs font-semibold text-slate-200">
              {selectedFile ? selectedFile.name : 'Click to select or drop an image file (PNG, JPG)'}
            </div>
            <div className="text-[11px] text-slate-500">
              Runs local OpenCV binarization + Tesseract OCR
            </div>
          </label>
        </div>

        {/* Preview & Action */}
        {previewUrl && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-3">
              <img src={previewUrl} alt="Preview" className="w-16 h-12 object-cover rounded border border-slate-700" />
              <div className="text-xs text-slate-300 font-medium">Image staged for OCR extraction</div>
            </div>
            <button
              onClick={handleRunOCR}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition"
            >
              <Sparkles size={13} />
              <span>{loading ? 'Processing OCR...' : 'Extract & Verify Claims'}</span>
            </button>
          </div>
        )}

        {/* Results */}
        {ocrResult && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-white">Extracted Visual Claims ({ocrResult.claims.length})</span>
              <span className="text-emerald-400 font-mono">Trust Score: {ocrResult.trust_score}%</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {ocrResult.claims.map((c, i) => (
                <div key={i} className="p-2.5 rounded bg-slate-900 border border-slate-800 text-xs">
                  <div className="flex justify-between font-bold text-slate-200 mb-1">
                    <span>"{c.claim_text}"</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded ${
                      c.status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>{c.status}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{c.explanation}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
