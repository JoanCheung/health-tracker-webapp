'use client';

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnalysisResponse, QuestionData, isAnalysisError, isAnalysisResult } from "../types/analysis";

// Complete questionnaire data structure
const quizSteps = [
  {
    step: 3,
    question: "请选择您的舌质颜色",
    key: "tongueBodyColor",
    options: ['淡白色', '淡红色', '红色', '深红色/绛色', '青紫色']
  },
  {
    step: 4,
    question: "请选择您的舌体形态",
    key: "tongueShape",
    options: ['正常', '胖大', '瘦薄', '裂纹', '齿痕']
  },
  {
    step: 5,
    question: "请选择您的舌苔颜色",
    key: "tongueCoatingColor",
    options: ['白苔', '黄苔', '灰苔', '黑苔', '无苔']
  },
  {
    step: 6,
    question: "请选择您的舌苔厚薄",
    key: "tongueCoatingThickness",
    options: ['薄苔', '厚苔', '少苔', '腻苔', '燥苔']
  }
];

const TOTAL_STEPS = 8; // Welcome, Basic Info, 4 tongue questions, Image Upload, Results

export default function Home() {
  // Wizard state management
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  
  // Flow control state for two-step diagnosis
  const [submissionState, setSubmissionState] = useState<'idle' | 'loadingQuestions' | 'questionsReady' | 'loadingAnalysis' | 'analysisReady'>('idle');
  
  // AI questions state
  const [aiQuestions, setAiQuestions] = useState<QuestionData[]>([]);
  const [aiAnswers, setAiAnswers] = useState<{[key: number]: string | string[]}>({});
  
  const [formData, setFormData] = useState({
    height: 160.0,
    weight: 55.0,
    tongueBodyColor: '',
    tongueShape: '',
    tongueCoatingColor: '',
    tongueCoatingThickness: '',
    mood: '',
    symptoms: '',
    medicalRecords: '',
    imageFile: null as File | null,
    imageUrl: ''
  });

  // Handle option selection for quiz questions
  const handleOptionChange = (stepNumber: number, value: string) => {
    const currentQuestion = quizSteps.find(step => step.step === stepNumber);
    if (currentQuestion) {
      setFormData(prev => ({
        ...prev,
        [currentQuestion.key]: value
      }));
    }
  };

  // Handle basic info changes
  const handleBasicInfoChange = (field: 'height' | 'weight', value: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle image file selection
  const handleImageChange = (file: File | null) => {
    setFormData(prev => ({
      ...prev,
      imageFile: file
    }));
  };

  // Main submission function
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      let uploadedImageUrl = '';
      
      // Upload image if provided
      if (formData.imageFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', formData.imageFile);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload,
        });
        
        const uploadData = await uploadResponse.json();
        if (uploadData.error) {
          throw new Error(uploadData.error);
        }
        uploadedImageUrl = uploadData.url;
        setFormData(prev => ({ ...prev, imageUrl: uploadedImageUrl }));
      }

      // FIRST SUBMISSION: Generate AI clarifying questions
      setSubmissionState('loadingQuestions');
      
      const questionsPayload = {
        // Spread all formData fields except imageFile (which is handled separately)
        ...Object.fromEntries(
          Object.entries(formData).filter(([key]) => key !== 'imageFile')
        ),
        // Override imageUrl with the uploaded URL
        imageUrl: uploadedImageUrl
      };

      const questionsResponse = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questionsPayload),
      });

      const questionsData = await questionsResponse.json();
      if (questionsData.error) {
        throw new Error(questionsData.error);
      }
      
      setAiQuestions(questionsData.questions);
      setSubmissionState('questionsReady');
    } catch (error) {
      console.error('Error submitting health data:', error);
      setAnalysis({ error: '抱歉，分析您的健康数据时出现错误。请重试。' });
      setCurrentStep(8);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle AI question answers (single select)
  const handleAiAnswerChange = (questionIndex: number, answer: string) => {
    setAiAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  // Handle checkbox answers (multi-select)
  const handleCheckboxChange = (questionIndex: number, optionValue: string) => {
    setAiAnswers(prev => {
      const currentAnswers = prev[questionIndex] || [];
      const answersArray = Array.isArray(currentAnswers) ? currentAnswers : [];
      
      const isChecked = answersArray.includes(optionValue);
      let newAnswers;
      
      if (isChecked) {
        // Remove the option if it's already selected
        newAnswers = answersArray.filter(answer => answer !== optionValue);
      } else {
        // Add the option if it's not selected
        newAnswers = [...answersArray, optionValue];
      }
      
      return {
        ...prev,
        [questionIndex]: newAnswers
      };
    });
  };

  // Final submission with AI answers
  const handleFinalSubmit = async () => {
    setSubmissionState('loadingAnalysis');
    
    try {
      // Gather ALL data: initial formData + imageUrl + AI answers
      const finalPayload = {
        // Spread all formData fields except imageFile
        ...Object.fromEntries(
          Object.entries(formData).filter(([key]) => key !== 'imageFile')
        ),
        // Add AI answers
        aiAnswers: aiAnswers
      };

      const analysisResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalPayload),
      });

      const analysisData = await analysisResponse.json();
      if (analysisData.error) {
        throw new Error(analysisData.error);
      }
      
      setAnalysis(analysisData);
      setSubmissionState('analysisReady');
    } catch (error) {
      console.error('Error in final analysis:', error);
      setAnalysis({ error: '抱歉，最终分析时出现错误。请重试。' });
      setSubmissionState('analysisReady');
    }
  };

  // Navigation functions
  const nextStep = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Get current question data for quiz steps
  const getCurrentQuestion = () => {
    return quizSteps.find(step => step.step === currentStep);
  };

  // Get current selected value for quiz steps
  const getCurrentValue = () => {
    const currentQuestion = getCurrentQuestion();
    if (currentQuestion) {
      return formData[currentQuestion.key as keyof typeof formData] as string;
    }
    return '';
  };

  // Check if current step can proceed
  const canProceed = () => {
    switch (currentStep) {
      case 1: // Welcome screen
        return true;
      case 2: // Basic info
        return formData.height >= 100 && formData.height <= 250 && formData.weight >= 30 && formData.weight <= 200;
      case 3:
      case 4:
      case 5:
      case 6: // Quiz questions
        return getCurrentValue() !== '';
      case 7: // Image upload (optional)
        return true;
      default:
        return false;
    }
  };

  const currentQuestion = getCurrentQuestion();

  return (
    <div className="font-sans min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 py-12 px-6">
      <main className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-black text-red-600 mb-6 animate-pulse">🚀 我的健康追踪器 🚀</h1>
          <p className="text-xl text-gray-600">基于中医理论的智能健康分析平台</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-2xl p-12 mb-10 border-4 border-blue-200 relative">
          {/* Profile Link */}
          <Link 
            href="/profile" 
            className="absolute top-6 right-6 inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            我的档案
          </Link>
          {/* MAIN WIZARD - Only visible when idle */}
          {submissionState === 'idle' && (
            <>
              {/* Progress indicator - Hidden on Welcome and Results screens */}
              {currentStep > 1 && currentStep < 8 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">步骤 {currentStep - 1} / {TOTAL_STEPS - 2}</span>
                <span className="text-sm text-gray-600">{Math.round(((currentStep - 1) / (TOTAL_STEPS - 2)) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-in-out"
                  style={{ width: `${((currentStep - 1) / (TOTAL_STEPS - 2)) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Step 1: Welcome Screen */}
          {currentStep === 1 && (
            <div className="text-center space-y-8">
              <div className="space-y-6">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-green-400 to-blue-500 rounded-full mb-6">
                  <span className="text-4xl">🌿</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800 mb-4">
                  开启您的专属健康分析
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  欢迎使用我们的中医健康评估系统！我们将通过几个简单的问题，
                  结合传统中医理论和现代健康科学，为您提供个性化的健康分析和建议。
                  整个过程只需要几分钟，让我们一起开始您的健康之旅吧！
                </p>
              </div>
              
              <div className="pt-8">
                <button
                  onClick={nextStep}
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white text-xl font-bold rounded-2xl shadow-lg hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-green-300 transition-all duration-300 transform hover:scale-105"
                >
                  <span className="mr-3">🚀</span>
                  开始评估
                  <svg className="w-6 h-6 ml-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Basic Info Screen */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <span className="text-2xl font-bold text-blue-600">📏</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  基本信息
                </h2>
                <p className="text-gray-600">请告诉我们您的身高和体重信息</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Height Input */}
                <div className="space-y-4">
                  <label className="block text-lg font-semibold text-gray-700">
                    身高 (cm)
                  </label>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min="100"
                      max="250"
                      value={formData.height}
                      onChange={(e) => handleBasicInfoChange('height', parseFloat(e.target.value))}
                      step="0.1"
                      className="w-full h-3 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        min="100"
                        max="250"
                        value={formData.height}
                        onChange={(e) => handleBasicInfoChange('height', parseFloat(e.target.value) || 160)}
                        step="0.1"
                        className="w-24 px-3 py-2 text-center border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                      <span className="text-gray-600">厘米</span>
                    </div>
                  </div>
                </div>

                {/* Weight Input */}
                <div className="space-y-4">
                  <label className="block text-lg font-semibold text-gray-700">
                    体重 (kg)
                  </label>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min="30"
                      max="200"
                      value={formData.weight}
                      onChange={(e) => handleBasicInfoChange('weight', parseFloat(e.target.value))}
                      step="0.1"
                      className="w-full h-3 bg-green-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        min="30"
                        max="200"
                        value={formData.weight}
                        onChange={(e) => handleBasicInfoChange('weight', parseFloat(e.target.value) || 55.0)}
                        step="0.1"
                        className="w-24 px-3 py-2 text-center border-2 border-green-300 rounded-lg focus:border-green-500 focus:outline-none"
                      />
                      <span className="text-gray-600">公斤</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BMI Display */}
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-1">您的BMI指数</p>
                <p className="text-2xl font-bold text-blue-600">
                  {((formData.weight / (formData.height / 100) ** 2)).toFixed(1)}
                </p>
              </div>
            </div>
          )}

          {/* Steps 3-6: Quiz Questions */}
          {currentStep >= 3 && currentStep <= 6 && currentQuestion && (
            <div className="space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <span className="text-2xl font-bold text-blue-600">{currentStep - 2}</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  {currentQuestion.question}
                </h2>
                <p className="text-gray-600">请选择最符合您情况的选项</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = getCurrentValue() === option;
                  return (
                    <label
                      key={index}
                      className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:scale-105 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-gray-300 bg-white hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`step-${currentStep}`}
                        value={option}
                        checked={isSelected}
                        onChange={(e) => handleOptionChange(currentStep, e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <span className={`text-lg font-medium ${
                          isSelected ? 'text-blue-700' : 'text-gray-700'
                        }`}>
                          {option}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 7: Image Upload */}
          {currentStep === 7 && (
            <div className="space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                  <span className="text-2xl">📸</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  最后一步：上传您的舌头照片
                </h2>
                <p className="text-gray-600">上传您的舌头照片以获得更精确的分析（可选）</p>
              </div>

              <div className="max-w-md mx-auto">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-700">点击上传照片</p>
                        <p className="text-sm text-gray-500">支持 JPG, PNG 格式</p>
                      </div>
                    </div>
                  </label>
                </div>

                {formData.imageFile && (
                  <div className="mt-6 space-y-4">
                    <div className="text-center">
                      <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        已选择: {formData.imageFile.name}
                      </div>
                    </div>
                    <div className="mt-4">
                      <Image
                        src={URL.createObjectURL(formData.imageFile)}
                        alt="舌头照片预览"
                        width={192}
                        height={192}
                        className="max-w-full h-auto max-h-48 rounded-lg border border-gray-300 mx-auto shadow-md"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 8: Results */}
          {currentStep === 8 && analysis && (
            <div className="space-y-8">
              {isSubmitting ? (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">正在分析中...</h2>
                  <p className="text-gray-600">请稍候，我们正在为您生成个性化的健康分析报告</p>
                </div>
              ) : isAnalysisError(analysis) ? (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                    <span className="text-2xl">❌</span>
                  </div>
                  <h2 className="text-3xl font-bold text-red-600 mb-2">分析失败</h2>
                  <p className="text-red-600">{analysis.error}</p>
                </div>
              ) : isAnalysisResult(analysis) ? (
                <div className="space-y-8">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                      <span className="text-2xl">✅</span>
                    </div>
                    <h2 className="text-3xl font-bold text-green-800 mb-2">分析完成</h2>
                    <p className="text-gray-600">基于您的信息，我们为您生成了以下健康分析报告</p>
                  </div>

                  <div className="bg-green-50 rounded-xl shadow-md p-8 border border-green-200">
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-2xl font-bold text-green-800 mb-4 flex items-center">
                          <span className="bg-green-100 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-lg">📊</span>
                          综合分析
                        </h3>
                        <p className="text-green-700 leading-relaxed text-lg bg-white bg-opacity-50 p-4 rounded-lg">{analysis.holisticAnalysis}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-xl font-bold text-green-800 mb-4 flex items-center">
                          <span className="bg-green-100 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-lg">🍽️</span>
                          饮食建议
                        </h4>
                        <ul className="text-green-700 space-y-3 bg-white bg-opacity-50 p-4 rounded-lg">
                          {analysis.dietarySuggestions?.map((suggestion: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <span className="text-green-600 mr-3 text-lg font-bold">•</span>
                              <span className="text-base leading-relaxed">{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="text-xl font-bold text-green-800 mb-4 flex items-center">
                          <span className="bg-green-100 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-lg">🏃</span>
                          生活建议
                        </h4>
                        <ul className="text-green-700 space-y-3 bg-white bg-opacity-50 p-4 rounded-lg">
                          {analysis.lifestyleSuggestions?.map((suggestion: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <span className="text-green-600 mr-3 text-lg font-bold">•</span>
                              <span className="text-base leading-relaxed">{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {analysis.importantNote && (
                        <div className="border-t border-green-200 pt-6">
                          <div className="bg-green-100 bg-opacity-50 p-4 rounded-lg">
                            <p className="text-green-700 text-sm italic flex items-start">
                              <span className="text-green-600 mr-2">⚠️</span>
                              {analysis.importantNote}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between items-center mt-12">
            {/* Back button - Hidden on Welcome and Results screens */}
            {currentStep > 1 && currentStep < 8 ? (
              <button
                onClick={prevStep}
                disabled={isSubmitting}
                className="flex items-center px-6 py-3 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                上一页
              </button>
            ) : currentStep === 8 ? (
              <button
                onClick={() => {
                  setCurrentStep(1);
                  setAnalysis(null);
                  setFormData({
                    height: 160.0,
                    weight: 55.0,
                    tongueBodyColor: '',
                    tongueShape: '',
                    tongueCoatingColor: '',
                    tongueCoatingThickness: '',
                    mood: '',
                    symptoms: '',
                    medicalRecords: '',
                    imageFile: null,
                    imageUrl: ''
                  });
                }}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                重新开始
              </button>
            ) : (
              <div></div>
            )}

            {/* Progress dots - Hidden on Welcome and Results screens */}
            {currentStep > 1 && currentStep < 8 && (
              <div className="flex space-x-2">
                {Array.from({ length: TOTAL_STEPS - 2 }, (_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index + 2 <= currentStep ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
            
            {/* Next/Submit button - Hidden on Welcome and Results screens */}
            {currentStep === 1 || currentStep === 8 ? (
              <div></div>
            ) : currentStep === 7 ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    分析中...
                  </>
                ) : analysis && isAnalysisResult(analysis) ? (
                  <>
                    提交并分析
                    <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </>
                ) : null}
              </button>
            ) : (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
                <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

              {/* Debug info (can be removed in production) */}
              {currentStep > 2 && (
                <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                  <h3 className="font-semibold mb-2">当前选择状态:</h3>
                  <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
                    <p>身高: {formData.height} cm</p>
                    <p>体重: {formData.weight} kg</p>
                    <p>舌质颜色: {formData.tongueBodyColor || '未选择'}</p>
                    <p>舌体形态: {formData.tongueShape || '未选择'}</p>
                    <p>舌苔颜色: {formData.tongueCoatingColor || '未选择'}</p>
                    <p>舌苔厚薄: {formData.tongueCoatingThickness || '未选择'}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* LOADING QUESTIONS STATE */}
          {submissionState === 'loadingQuestions' && (
            <div className="text-center space-y-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">AI正在生成问题...</h2>
              <p className="text-gray-600">请稍候，我们正在根据您的初步信息生成个性化的诊断问题</p>
            </div>
          )}

          {/* AI QUESTIONS SECTION */}
          {submissionState === 'questionsReady' && (
            <div className="space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                  <span className="text-2xl">🤖</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">AI正在进一步提问...</h2>
                <p className="text-gray-600">基于您的初步信息，AI需要进一步了解以下情况来提供更精确的分析</p>
              </div>

              <div className="space-y-6">
                {aiQuestions.map((question, index) => {
                  const isMultiSelect = question.allowMultiple;
                  return (
                    <div key={index} className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-xl font-semibold text-gray-800 mb-4">
                        {index + 1}. {question.questionText}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {question.options.map((option: string, optionIndex: number) => {
                          let isSelected;
                          if (isMultiSelect) {
                            const answers = aiAnswers[index] || [];
                            isSelected = Array.isArray(answers) && answers.includes(option);
                          } else {
                            isSelected = aiAnswers[index] === option;
                          }
                          
                          return (
                            <label
                              key={optionIndex}
                              className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:scale-105 ${
                                isSelected
                                  ? 'border-purple-500 bg-purple-50 shadow-lg'
                                  : 'border-gray-300 bg-white hover:border-purple-300 hover:shadow-md'
                              }`}
                            >
                              <input
                                type={isMultiSelect ? "checkbox" : "radio"}
                                name={isMultiSelect ? undefined : `ai-question-${index}`}
                                value={option}
                                checked={isSelected}
                                onChange={(e) => {
                                  if (isMultiSelect) {
                                    handleCheckboxChange(index, e.target.value);
                                  } else {
                                    handleAiAnswerChange(index, e.target.value);
                                  }
                                }}
                                className="sr-only"
                              />
                              <div className="flex items-center">
                                {isMultiSelect ? (
                                  // Checkbox style
                                  <div className={`w-4 h-4 border-2 mr-3 flex items-center justify-center ${
                                    isSelected
                                      ? 'border-purple-500 bg-purple-500'
                                      : 'border-gray-300'
                                  }`}>
                                    {isSelected && (
                                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                ) : analysis && isAnalysisResult(analysis) ? (
                                  // Radio style
                                  <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                                    isSelected
                                      ? 'border-purple-500 bg-purple-500'
                                      : 'border-gray-300'
                                  }`}>
                                    {isSelected && (
                                      <div className="w-2 h-2 rounded-full bg-white"></div>
                                    )}
                                  </div>
                                ) : null}
                                <span className={`text-base font-medium ${
                                  isSelected ? 'text-purple-700' : 'text-gray-700'
                                }`}>
                                  {option}
                                </span>
                              </div>
                              {isSelected && (
                                <div className="absolute top-3 right-3">
                                  <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-center pt-6">
                <button
                  onClick={handleFinalSubmit}
                  disabled={
                    aiQuestions.some((question, index) => {
                      const answer = aiAnswers[index];
                      if (question.allowMultiple) {
                        return !answer || !Array.isArray(answer) || answer.length === 0;
                      } else {
                        return !answer || (Array.isArray(answer) && answer.length === 0);
                      }
                    })
                  }
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xl font-bold rounded-2xl shadow-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-4 focus:ring-purple-300 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <span className="mr-3">🚀</span>
                  提交最终答案
                  <svg className="w-6 h-6 ml-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* LOADING ANALYSIS STATE */}
          {submissionState === 'loadingAnalysis' && (
            <div className="text-center space-y-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">正在进行最终分析...</h2>
              <p className="text-gray-600">请稍候，我们正在整合所有信息为您生成完整的健康分析报告</p>
            </div>
          )}

          {/* FINAL ANALYSIS RESULTS */}
          {submissionState === 'analysisReady' && analysis && (
            <div className="space-y-8">
              {isAnalysisError(analysis) ? (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                    <span className="text-2xl">❌</span>
                  </div>
                  <h2 className="text-3xl font-bold text-red-600 mb-2">分析失败</h2>
                  <p className="text-red-600">{analysis.error}</p>
                </div>
              ) : isAnalysisResult(analysis) ? (
                <div className="space-y-8">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                      <span className="text-2xl">✅</span>
                    </div>
                    <h2 className="text-3xl font-bold text-green-800 mb-2">分析完成</h2>
                    <p className="text-gray-600">基于您的完整信息和AI进一步询问，我们为您生成了详细的健康分析报告</p>
                  </div>

                  <div className="bg-green-50 rounded-xl shadow-md p-8 border border-green-200">
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-2xl font-bold text-green-800 mb-4 flex items-center">
                          <span className="bg-green-100 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-lg">📊</span>
                          综合分析
                        </h3>
                        <p className="text-green-700 leading-relaxed text-lg bg-white bg-opacity-50 p-4 rounded-lg">{analysis.holisticAnalysis}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-xl font-bold text-green-800 mb-4 flex items-center">
                          <span className="bg-green-100 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-lg">🍽️</span>
                          饮食建议
                        </h4>
                        <ul className="text-green-700 space-y-3 bg-white bg-opacity-50 p-4 rounded-lg">
                          {analysis.dietarySuggestions?.map((suggestion: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <span className="text-green-600 mr-3 text-lg font-bold">•</span>
                              <span className="text-base leading-relaxed">{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="text-xl font-bold text-green-800 mb-4 flex items-center">
                          <span className="bg-green-100 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-lg">🏃</span>
                          生活建议
                        </h4>
                        <ul className="text-green-700 space-y-3 bg-white bg-opacity-50 p-4 rounded-lg">
                          {analysis.lifestyleSuggestions?.map((suggestion: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <span className="text-green-600 mr-3 text-lg font-bold">•</span>
                              <span className="text-base leading-relaxed">{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {analysis.importantNote && (
                        <div className="border-t border-green-200 pt-6">
                          <div className="bg-green-100 bg-opacity-50 p-4 rounded-lg">
                            <p className="text-green-700 text-sm italic flex items-start">
                              <span className="text-green-600 mr-2">⚠️</span>
                              {analysis.importantNote}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-center pt-6">
                    <button
                      onClick={() => {
                        setCurrentStep(1);
                        setSubmissionState('idle');
                        setAnalysis(null);
                        setAiQuestions([]);
                        setAiAnswers({});
                        setFormData({
                          height: 160.0,
                          weight: 55.0,
                          tongueBodyColor: '',
                          tongueShape: '',
                          tongueCoatingColor: '',
                          tongueCoatingThickness: '',
                          mood: '',
                          symptoms: '',
                          medicalRecords: '',
                          imageFile: null,
                          imageUrl: ''
                        });
                      }}
                      className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-200"
                    >
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      重新开始
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </main>
      
      <footer className="mt-16 pb-8 flex gap-6 flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="文件图标"
            width={16}
            height={16}
          />
          学习
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="窗口图标"
            width={16}
            height={16}
          />
          示例
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="地球图标"
            width={16}
            height={16}
          />
          访问 nextjs.org →
        </a>
      </footer>
    </div>
  );
}