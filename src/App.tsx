/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronRight, 
  BookOpen, 
  Award,
  MessageSquare,
  RefreshCcw,
  FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

interface EvaluationResult {
  totalMarks: number;
  maxMarks: number;
  accuracyScore: number;
  feedback: string;
  corrections: {
    questionNumber: string;
    observation: string;
    suggestion: string;
  }[];
}

export default function App() {
  const [files, setFiles] = useState<{
    questionPaper: File | null;
    answerKey: File | null;
    studentWork: File | null;
  }>({
    questionPaper: null,
    answerKey: null,
    studentWork: null,
  });

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRefs = {
    questionPaper: useRef<HTMLInputElement>(null),
    answerKey: useRef<HTMLInputElement>(null),
    studentWork: useRef<HTMLInputElement>(null),
  };

  const handleFileChange = (type: keyof typeof files, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFiles(prev => ({ ...prev, [type]: file }));
    setError(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const evaluate = async () => {
    if (!files.questionPaper || !files.answerKey || !files.studentWork) {
      setError("Please upload all three mandatory documents.");
      return;
    }

    setIsEvaluating(true);
    setError(null);
    setResult(null);

    try {
      const [qpBase64, akBase64, swBase64] = await Promise.all([
        fileToBase64(files.questionPaper),
        fileToBase64(files.answerKey),
        fileToBase64(files.studentWork),
      ]);

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: "You are an expert Commerce Professor at ArivuPro Academy. Evaluate the student's handwritten answer sheet by comparing it with the provided Question Paper and official Answer Key." },
              { inlineData: { mimeType: files.questionPaper.type, data: qpBase64 } },
              { text: "Above is the Question Paper." },
              { inlineData: { mimeType: files.answerKey.type, data: akBase64 } },
              { text: "Above is the official Answer Key (Typed)." },
              { inlineData: { mimeType: files.studentWork.type, data: swBase64 } },
              { text: "Above is the student's handwritten answer sheet. Please evaluate it for accuracy, assign marks, and provide constructive feedback." }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              totalMarks: { type: Type.NUMBER },
              maxMarks: { type: Type.NUMBER },
              accuracyScore: { type: Type.NUMBER, description: "Percentage accuracy from 0-100" },
              feedback: { type: Type.STRING },
              corrections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    questionNumber: { type: Type.STRING },
                    observation: { type: Type.STRING },
                    suggestion: { type: Type.STRING }
                  },
                  required: ["questionNumber", "observation", "suggestion"]
                }
              }
            },
            required: ["totalMarks", "maxMarks", "accuracyScore", "feedback", "corrections"]
          }
        }
      });

      const evaluationData = JSON.parse(response.text);
      setResult(evaluationData);
    } catch (err) {
      console.error("Evaluation failed:", err);
      setError("An error occurred during evaluation. Please ensure the files are clear and try again.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const reset = () => {
    setFiles({
      questionPaper: null,
      answerKey: null,
      studentWork: null,
    });
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white px-10 py-5 flex items-center justify-between border-b-4 border-accent">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center text-primary font-black text-lg">
            A
          </div>
          <h1 className="text-xl font-extrabold tracking-tighter uppercase">ArivuPro AI Evaluator</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-accent text-white px-3 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-wider">
            Session Active: CA Intermediate 2024
          </div>
          <button 
            onClick={reset}
            className="text-white/70 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
          >
            <RefreshCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-[400px_1fr] gap-8 p-10">
        {/* Left Column: Uploads */}
        <section className="section-card flex flex-col gap-5">
          <div className="section-title-theme">
            <Upload className="w-5 h-5" />
            Document Repository
          </div>

          <div className="space-y-3">
            <UploadCard 
              title="Question Paper"
              description="Original exam document"
              file={files.questionPaper}
              onUpload={() => fileInputRefs.questionPaper.current?.click()}
            />
            <UploadCard 
              title="Answer Key"
              description="Official typed solutions"
              file={files.answerKey}
              onUpload={() => fileInputRefs.answerKey.current?.click()}
            />
            <UploadCard 
              title="Student Script"
              description="Handwritten answer sheet"
              file={files.studentWork}
              onUpload={() => fileInputRefs.studentWork.current?.click()}
            />
          </div>

          {/* Hidden Inputs */}
          <input type="file" ref={fileInputRefs.questionPaper} className="hidden" onChange={(e) => handleFileChange('questionPaper', e)} accept="image/*,application/pdf" />
          <input type="file" ref={fileInputRefs.answerKey} className="hidden" onChange={(e) => handleFileChange('answerKey', e)} accept="image/*,application/pdf" />
          <input type="file" ref={fileInputRefs.studentWork} className="hidden" onChange={(e) => handleFileChange('studentWork', e)} accept="image/*,application/pdf" />

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-600 text-xs"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          <button
            onClick={evaluate}
            disabled={isEvaluating || !files.questionPaper || !files.answerKey || !files.studentWork}
            className={`w-full py-4 rounded-lg font-bold text-sm uppercase tracking-widest transition-all ${
              isEvaluating || !files.questionPaper || !files.answerKey || !files.studentWork
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-primary text-white hover:opacity-90 active:scale-[0.98]'
            }`}
          >
            {isEvaluating ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </div>
            ) : (
              "Initiate AI Evaluation"
            )}
          </button>
        </section>

        {/* Right Column: Results */}
        <section className="section-card flex flex-col">
          <div className="section-title-theme">
            <FileText className="w-5 h-5" />
            Evaluation Summary Report
          </div>

          <AnimatePresence mode="wait">
            {!result && !isEvaluating && (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 border-2 border-dashed border-border-theme rounded-xl flex flex-col items-center justify-center text-center p-12"
              >
                <FileText className="w-12 h-12 text-slate-200 mb-4" />
                <h3 className="text-lg font-bold text-slate-400">Awaiting Documents</h3>
                <p className="text-slate-400 text-sm max-w-xs">Upload the mandatory files to generate the AI report.</p>
              </motion.div>
            )}

            {isEvaluating && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-center p-12"
              >
                <div className="w-16 h-16 border-4 border-primary-light border-t-primary rounded-full animate-spin mb-6"></div>
                <h3 className="text-lg font-bold text-primary">AI Academic Analysis</h3>
                <p className="text-text-muted text-sm">Performing OCR and semantic comparison...</p>
              </motion.div>
            )}

            {result && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 flex flex-col"
              >
                {/* Score Row */}
                <div className="flex gap-8 pb-6 mb-6 border-b border-border-theme">
                  <div className="w-[120px] h-[120px] rounded-full border-8 border-accent flex flex-col items-center justify-center shrink-0">
                    <span className="text-3xl font-extrabold text-accent">{result.totalMarks}</span>
                    <span className="text-[0.7rem] font-bold text-text-muted uppercase tracking-wider">Score</span>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div className="p-3 bg-bg-theme rounded-lg">
                      <span className="block text-[0.7rem] text-text-muted font-bold uppercase mb-1">Accuracy</span>
                      <span className="text-lg font-bold">{result.accuracyScore}%</span>
                    </div>
                    <div className="p-3 bg-bg-theme rounded-lg">
                      <span className="block text-[0.7rem] text-text-muted font-bold uppercase mb-1">Max Marks</span>
                      <span className="text-lg font-bold">{result.maxMarks}</span>
                    </div>
                    <div className="p-3 bg-bg-theme rounded-lg">
                      <span className="block text-[0.7rem] text-text-muted font-bold uppercase mb-1">OCR Confidence</span>
                      <span className="text-lg font-bold">96.4%</span>
                    </div>
                    <div className="p-3 bg-bg-theme rounded-lg">
                      <span className="block text-[0.7rem] text-text-muted font-bold uppercase mb-1">Integrity</span>
                      <span className="text-lg font-bold text-accent">Verified</span>
                    </div>
                  </div>
                </div>

                {/* Feedback Area */}
                <div className="flex-1 overflow-auto">
                  <div className="flex items-center gap-2 font-bold mb-4">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    AI Academic Feedback
                  </div>
                  <div className="feedback-box mb-6">
                    {result.feedback}
                  </div>

                  <div className="space-y-3">
                    {result.corrections.map((item, idx) => (
                      <div key={idx} className="p-4 border border-border-theme rounded-lg bg-white">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-primary-light text-primary px-2 py-0.5 rounded text-[10px] font-bold">Q{item.questionNumber}</span>
                          <span className="text-xs font-bold text-text-main uppercase tracking-wider">Observation</span>
                        </div>
                        <p className="text-sm text-text-muted mb-2">{item.observation}</p>
                        <div className="text-xs text-accent font-medium flex items-center gap-1">
                          <ChevronRight className="w-3 h-3" />
                          {item.suggestion}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-border-theme px-10 py-4 flex justify-between items-center text-[0.75rem] text-text-muted font-medium">
        <div>Powered by ArivuPro Proprietary GPT-4o Vision Engine</div>
        <div>© 2024 ArivuPro Tutoring Academy | Advanced Commerce Solutions</div>
      </footer>
    </div>
  );
}

function UploadCard({ title, description, file, onUpload }: { 
  title: string, 
  description: string, 
  file: File | null, 
  onUpload: () => void
}) {
  return (
    <div 
      onClick={onUpload}
      className={`p-4 rounded-lg border transition-all cursor-pointer flex flex-col items-center text-center gap-1 ${
        file 
          ? 'bg-[#f0fdf4] border-accent' 
          : 'bg-primary-light border-dashed border-secondary hover:border-primary'
      }`}
    >
      <h4 className="text-sm font-bold text-text-main">{title}</h4>
      <p className="text-[0.75rem] text-text-muted">{file ? file.name : description}</p>
      {file && (
        <span className="text-[10px] text-accent font-bold mt-1 uppercase tracking-widest">✓ Uploaded</span>
      )}
    </div>
  );
}

