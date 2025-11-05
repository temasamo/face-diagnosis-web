// 動的レンダリングを強制
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <h1 className="text-3xl font-bold text-center">顔診断AIアプリ</h1>
        
        <div className="text-center text-gray-600 dark:text-gray-400 mb-4">
          <p className="text-lg">高精度な顔診断で、あなたの美しさを数値化</p>
          <p className="text-sm mt-2">Google Cloud Vision APIと独自アルゴリズムによる精密分析</p>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
                 <a
                   className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
                   href="/ai/face"
                 >
                   📷 カメラ撮影診断
                 </a>
                 <a
                   className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-blue-600 text-white gap-2 hover:bg-blue-700 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
                   href="/compare"
                 >
                   📸 画像アップロード診断
                 </a>
               </div>
      </main>
      <footer className="row-start-3 flex flex-col items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400">
        <p className="mb-2">© 2024 顔診断AIアプリ - 高精度な顔分析技術</p>
        <p className="text-xs">Powered by Google Cloud Vision API & Next.js</p>
      </footer>
    </div>
  );
}
