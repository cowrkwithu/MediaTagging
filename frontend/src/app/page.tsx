'use client';

import Link from 'next/link';
import { Upload, Search, Video, Image } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="text-center py-12">
        <h1 className="text-4xl font-bold mb-4">Media Tagging System</h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          동영상과 사진을 업로드하고 AI 기반 자동 태깅으로 쉽게 관리하세요
        </p>
        <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
          비전 AI가 콘텐츠를 분석하여 자동으로 태그를 생성합니다
        </p>
      </section>

      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href="/upload"
          className="group p-6 border rounded-lg hover:border-blue-500 hover:shadow-lg transition-all"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
              <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold">파일 업로드</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              동영상 또는 사진을 업로드하고 자동 태깅을 시작하세요
            </p>
          </div>
        </Link>

        <Link
          href="/videos"
          className="group p-6 border rounded-lg hover:border-green-500 hover:shadow-lg transition-all"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-green-100 dark:bg-green-900 rounded-full group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors">
              <Video className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold">동영상 관리</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              업로드된 동영상 목록을 확인하고 관리하세요
            </p>
          </div>
        </Link>

        <Link
          href="/images"
          className="group p-6 border rounded-lg hover:border-orange-500 hover:shadow-lg transition-all"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-orange-100 dark:bg-orange-900 rounded-full group-hover:bg-orange-200 dark:group-hover:bg-orange-800 transition-colors">
              <Image className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-xl font-semibold">사진 관리</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              업로드된 사진 목록을 확인하고 관리하세요
            </p>
          </div>
        </Link>

        <Link
          href="/search"
          className="group p-6 border rounded-lg hover:border-purple-500 hover:shadow-lg transition-all"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-purple-100 dark:bg-purple-900 rounded-full group-hover:bg-purple-200 dark:group-hover:bg-purple-800 transition-colors">
              <Search className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold">검색</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              태그 기반으로 동영상, 사진, 장면을 검색하세요
            </p>
          </div>
        </Link>
      </section>
    </div>
  );
}
