'use client';

import { useState } from 'react';
import {
  Upload,
  Video,
  Image,
  Search,
  Tag,
  Play,
  Download,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Section {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

export default function HelpPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>('upload');

  const sections: Section[] = [
    {
      id: 'upload',
      title: '파일 업로드',
      icon: Upload,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">지원 파일 형식</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-5 h-5 text-blue-600" />
                <span className="font-medium">동영상</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                MP4, MOV, AVI, MKV, WebM, WMV, FLV
              </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Image className="w-5 h-5 text-green-600" />
                <span className="font-medium">사진</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                JPG, JPEG, PNG, GIF, WebP, BMP, TIFF
              </p>
            </div>
          </div>

          <h4 className="font-semibold text-lg mt-6">업로드 방법</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>상단 메뉴에서 <strong>업로드</strong>를 클릭합니다.</li>
            <li>파일을 드래그하여 업로드 영역에 놓거나, 영역을 클릭하여 파일을 선택합니다.</li>
            <li>여러 파일을 동시에 선택하여 업로드할 수 있습니다.</li>
            <li>폴더를 선택하면 폴더 내 모든 미디어 파일이 업로드됩니다.</li>
            <li>업로드 진행률이 표시되며, 완료 후 자동으로 목록에 추가됩니다.</li>
          </ol>

          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mt-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>팁:</strong> 대용량 파일은 업로드에 시간이 걸릴 수 있습니다. 업로드 중에는 페이지를 닫지 마세요.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'videos',
      title: '동영상 관리',
      icon: Video,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">동영상 목록</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>업로드된 모든 동영상이 카드 형태로 표시됩니다.</li>
            <li>각 카드에는 썸네일, 제목, 상태, 재생 시간이 표시됩니다.</li>
            <li>상태 배지: <span className="px-2 py-0.5 bg-gray-200 rounded text-xs">업로드됨</span>, <span className="px-2 py-0.5 bg-blue-200 rounded text-xs">처리 중</span>, <span className="px-2 py-0.5 bg-green-200 rounded text-xs">태깅 완료</span></li>
          </ul>

          <h4 className="font-semibold text-lg mt-6">동영상 상세 페이지</h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Play className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">비디오 플레이어</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">동영상을 재생하고 원하는 위치로 이동할 수 있습니다.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-green-500 rounded mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">장면 타임라인</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">AI가 감지한 장면이 색상별로 표시됩니다. 클릭하면 해당 장면으로 이동합니다.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">AI 태깅</p>
                <p className="text-sm text-gray-600 dark:text-gray-400"><strong>태깅 시작</strong> 버튼을 클릭하면 AI가 동영상을 분석하여 요약과 태그를 생성합니다.</p>
              </div>
            </div>
          </div>

          <h4 className="font-semibold text-lg mt-6">장면 관리</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>각 장면을 클릭하면 상세 정보와 태그가 표시됩니다.</li>
            <li>장면별로 메모를 추가할 수 있습니다 (<code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">#태그</code> 형식으로 사용자 태그 추가).</li>
            <li><Download className="w-4 h-4 inline" /> 버튼으로 개별 장면을 다운로드할 수 있습니다.</li>
            <li>여러 장면을 선택하여 하나의 영상으로 병합 내보내기가 가능합니다.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'images',
      title: '사진 관리',
      icon: Image,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">사진 목록</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>업로드된 모든 사진이 그리드 형태로 표시됩니다.</li>
            <li>각 카드에는 썸네일, 파일명, 상태, 크기가 표시됩니다.</li>
            <li>카드를 클릭하면 상세 페이지로 이동합니다.</li>
          </ul>

          <h4 className="font-semibold text-lg mt-6">사진 상세 페이지</h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Image className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">원본 이미지</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">고해상도 원본 이미지를 확인할 수 있습니다.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">AI 분석</p>
                <p className="text-sm text-gray-600 dark:text-gray-400"><strong>태깅 시작</strong> 버튼을 클릭하면 AI가 사진을 분석하여 설명(2-3문장)과 태그(5-15개)를 생성합니다.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Edit2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">편집 기능</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">제목과 AI 설명을 직접 편집할 수 있습니다.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-gray-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">다운로드</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">원본 사진을 다운로드할 수 있습니다.</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'tags',
      title: '태그 관리',
      icon: Tag,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">태그 종류</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">AI 태그</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AI가 미디어를 분석하여 자동으로 생성한 태그입니다. 파란색으로 표시됩니다.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded-full"># 사용자 태그</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                사용자가 직접 추가한 태그입니다. 보라색으로 표시되며 # 기호가 붙습니다.
              </p>
            </div>
          </div>

          <h4 className="font-semibold text-lg mt-6">태그 추가하기</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>동영상, 사진, 또는 장면의 상세 페이지로 이동합니다.</li>
            <li>태그 섹션 하단의 <strong>+ 태그 추가</strong> 버튼을 클릭합니다.</li>
            <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">#태그1 #태그2</code> 형식으로 입력합니다.</li>
            <li><strong>추가</strong> 버튼을 클릭하여 저장합니다.</li>
          </ol>

          <h4 className="font-semibold text-lg mt-6">태그 삭제하기</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>삭제하려는 태그 위에 마우스를 올립니다.</li>
            <li>태그 오른쪽에 나타나는 <Trash2 className="w-3 h-3 inline" /> 버튼을 클릭합니다.</li>
            <li>확인 메시지에서 승인하면 태그가 삭제됩니다.</li>
          </ol>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg mt-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>참고:</strong> AI 태그와 사용자 태그 모두 삭제할 수 있습니다. 삭제된 태그는 검색 결과에서 제외됩니다.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'search',
      title: '검색 기능',
      icon: Search,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">검색 모드</h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="px-3 py-1 bg-blue-500 text-white text-xs rounded shrink-0">AND</span>
              <div>
                <p className="font-medium">그리고 (모두 포함)</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">선택한 모든 태그를 포함하는 결과만 표시합니다.</p>
                <p className="text-xs text-gray-500 mt-1">예: "고양이" AND "귀여운" → 두 태그 모두 있는 결과</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="px-3 py-1 bg-green-500 text-white text-xs rounded shrink-0">OR</span>
              <div>
                <p className="font-medium">또는 (하나 이상 포함)</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">선택한 태그 중 하나 이상을 포함하는 결과를 표시합니다.</p>
                <p className="text-xs text-gray-500 mt-1">예: "고양이" OR "강아지" → 둘 중 하나라도 있는 결과</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="px-3 py-1 bg-red-500 text-white text-xs rounded shrink-0">NOT</span>
              <div>
                <p className="font-medium">제외 (포함하지 않음)</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">선택한 태그를 포함하지 않는 결과만 표시합니다.</p>
                <p className="text-xs text-gray-500 mt-1">예: NOT "싸움" → "싸움" 태그가 없는 결과</p>
              </div>
            </div>
          </div>

          <h4 className="font-semibold text-lg mt-6">검색 방법</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>상단 메뉴에서 <strong>검색</strong>을 클릭합니다.</li>
            <li>검색 모드(AND/OR/NOT)를 선택합니다.</li>
            <li>태그를 입력하거나 인기 태그 버튼을 클릭하여 추가합니다.</li>
            <li><strong>검색</strong> 버튼을 클릭하면 결과가 표시됩니다.</li>
            <li>결과는 동영상, 사진, 장면 탭으로 구분되어 표시됩니다.</li>
          </ol>

          <h4 className="font-semibold text-lg mt-6">검색 결과 활용</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>동영상/사진 클릭:</strong> 해당 미디어의 상세 페이지로 이동합니다.</li>
            <li><strong>장면 클릭:</strong> 해당 동영상의 상세 페이지로 이동하고, 클릭한 장면이 자동으로 선택됩니다.</li>
            <li><strong>뒤로가기:</strong> 상세 페이지에서 뒤로가기 버튼을 누르면 검색 결과가 유지됩니다.</li>
          </ul>

          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg mt-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>팁:</strong> 검색 조건은 URL에 저장되므로 북마크하거나 공유할 수 있습니다.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'tips',
      title: '유용한 팁',
      icon: HelpCircle,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">AI 태깅 최적화</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>선명하고 잘 촬영된 미디어일수록 AI 분석 결과가 정확합니다.</li>
            <li>동영상의 경우 장면 전환이 명확할수록 장면 감지가 정확합니다.</li>
            <li>태깅은 시간이 걸릴 수 있습니다. 처리 중에는 상태가 자동으로 업데이트됩니다.</li>
          </ul>

          <h4 className="font-semibold text-lg mt-6">효율적인 검색</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>구체적인 태그를 사용할수록 정확한 결과를 얻을 수 있습니다.</li>
            <li>AND와 OR를 조합하여 복잡한 검색이 가능합니다.</li>
            <li>원하지 않는 결과가 많다면 NOT을 활용하세요.</li>
          </ul>

          <h4 className="font-semibold text-lg mt-6">키보드 단축키</h4>
          <div className="grid md:grid-cols-2 gap-2">
            <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span>동영상 재생/일시정지</span>
              <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-sm">Space</kbd>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span>전체화면</span>
              <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-sm">F</kbd>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span>뒤로 10초</span>
              <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-sm">←</kbd>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span>앞으로 10초</span>
              <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-sm">→</kbd>
            </div>
          </div>

          <h4 className="font-semibold text-lg mt-6">문제 해결</h4>
          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <p className="font-medium">태깅이 완료되지 않아요</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                AI 서버(Ollama)가 실행 중인지 확인하세요. 대용량 파일은 처리 시간이 더 걸릴 수 있습니다.
              </p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="font-medium">동영상이 재생되지 않아요</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                지원되는 형식인지 확인하세요. 일부 코덱은 브라우저에서 지원되지 않을 수 있습니다.
              </p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="font-medium">검색 결과가 없어요</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                태그 철자를 확인하고, AND 대신 OR로 검색해 보세요. 태깅이 완료된 미디어만 검색됩니다.
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <HelpCircle className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold">사용 설명서</h1>
          <p className="text-gray-500">Media Tagging 시스템 사용 가이드</p>
        </div>
      </div>

      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
        <p className="text-gray-700 dark:text-gray-300">
          Media Tagging은 AI를 활용하여 동영상과 사진을 자동으로 분석하고 태그를 생성하는 시스템입니다.
          아래 섹션을 클릭하여 각 기능의 상세 사용법을 확인하세요.
        </p>
      </div>

      <div className="space-y-2">
        {sections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSection === section.id;

          return (
            <div key={section.id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-4 text-left transition-colors',
                  isExpanded
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
              >
                <Icon className={cn('w-5 h-5', isExpanded ? 'text-blue-600' : 'text-gray-500')} />
                <span className={cn('font-medium flex-1', isExpanded && 'text-blue-600')}>
                  {section.title}
                </span>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {isExpanded && (
                <div className="p-4 border-t bg-white dark:bg-gray-900">
                  {section.content}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
        <p className="text-sm text-gray-500">
          추가 질문이 있으시면 시스템 관리자에게 문의하세요.
        </p>
      </div>
    </div>
  );
}
