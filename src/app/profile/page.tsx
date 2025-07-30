'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

interface HealthRecord {
  id: number;
  created_at: string;
  image_url: string;
  analysis: string;
  height: number;
  weight: number;
  tongue_body_color: string;
  tongue_shape: string;
  tongue_coating_color: string;
  tongue_coating_thickness: string;
  mood?: string;
  symptoms?: string;
  medical_records?: string;
}

export default function ProfilePage() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [recordDates, setRecordDates] = useState<Set<string>>(new Set());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await fetch('/api/records');
        if (response.ok) {
          const data = await response.json();
          setRecords(data);
          
          // Process dates for calendar marking
          const dates = new Set<string>();
          data.forEach((record: HealthRecord) => {
            const date = new Date(record.created_at).toDateString();
            dates.add(date);
          });
          setRecordDates(dates);
        }
      } catch (error) {
        console.error('Error fetching records:', error);
      }
    };

    fetchRecords();
  }, []);

  const tileClassName = ({ date }: { date: Date }) => {
    const dateString = date.toDateString();
    return recordDates.has(dateString) ? 'bg-blue-200 rounded-full' : '';
  };

  const handleDateClick = (date: Date) => {
    const dateString = date.toDateString();
    const recordForDate = records.find(record => 
      new Date(record.created_at).toDateString() === dateString
    );
    setSelectedRecord(recordForDate || null);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">健康档案</h1>
        <Link 
          href="/" 
          className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回主页
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isClient ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">健康记录日历</h2>
            <Calendar
              tileClassName={tileClassName}
              onClickDay={handleDateClick}
              className="w-full"
            />
            <p className="text-sm text-gray-600 mt-4">
              蓝色标记的日期有健康记录，点击查看详情
            </p>
          </div>
        ) : null}

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">记录详情</h2>
          {selectedRecord ? (
            <div className="bg-slate-50 rounded-xl p-6 shadow-lg border border-gray-200">
              {/* Header with timestamp */}
              <div className="mb-6 pb-4 border-b border-gray-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-800">健康记录详情</h3>
                  <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full shadow-sm">
                    {(() => {
                      const date = new Date(selectedRecord.created_at);
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const hours = String(date.getHours()).padStart(2, '0');
                      const minutes = String(date.getMinutes()).padStart(2, '0');
                      return `${year}年${month}月${day}日 ${hours}:${minutes}`;
                    })()}
                  </span>
                </div>
              </div>
              
              {/* Prominent tongue image section */}
              {selectedRecord.image_url && (
                <div className="mb-6">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-lg">📸</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">舌诊图片</h3>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-md">
                    <Image 
                      src={selectedRecord.image_url} 
                      alt="舌诊图片" 
                      width={384}
                      height={384}
                      className="w-full max-w-sm mx-auto rounded-lg shadow-md border border-gray-200"
                    />
                  </div>
                </div>
              )}

              {/* Basic info section */}
              <div className="mb-6">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-lg">📊</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">基本信息</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-md">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-600 w-20">身高:</span>
                      <span className="text-gray-800">{selectedRecord.height}cm</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-600 w-20">体重:</span>
                      <span className="text-gray-800">{selectedRecord.weight}kg</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-600 w-20">舌质:</span>
                      <span className="text-gray-800">{selectedRecord.tongue_body_color}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-600 w-20">舌形:</span>
                      <span className="text-gray-800">{selectedRecord.tongue_shape}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-600 w-20">舌苔:</span>
                      <span className="text-gray-800">{selectedRecord.tongue_coating_color}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-600 w-20">厚度:</span>
                      <span className="text-gray-800">{selectedRecord.tongue_coating_thickness}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional info sections */}
              {(selectedRecord.mood || selectedRecord.symptoms || selectedRecord.medical_records) && (
                <div className="mb-6">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-lg">📝</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">补充信息</h3>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-md space-y-3">
                    {selectedRecord.mood && (
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-1">心情状态</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{selectedRecord.mood}</p>
                      </div>
                    )}
                    {selectedRecord.symptoms && (
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-1">症状描述</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{selectedRecord.symptoms}</p>
                      </div>
                    )}
                    {selectedRecord.medical_records && (
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-1">病史记录</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{selectedRecord.medical_records}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Analysis section */}
              {selectedRecord.analysis && (
                <div>
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-lg">🤖</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">AI智能分析</h3>
                  </div>
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-5 rounded-xl shadow-md border border-blue-200">
                    <div className="bg-white bg-opacity-80 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                        {selectedRecord.analysis}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">请选择日历中的日期查看健康记录详情</p>
          )}
        </div>
      </div>
    </div>
  );
}