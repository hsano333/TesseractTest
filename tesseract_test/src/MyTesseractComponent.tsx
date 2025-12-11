// src/MyTesseractComponent.tsx (ライブOCR対応版)

import React, { useState, useRef, useEffect, useCallback } from 'react';

// 💡 CDN経由で読み込んだグローバル変数 Tesseract の存在を宣言
declare const Tesseract: any; 

// Tesseract.js の認識結果オブジェクトの型定義（簡略化）
interface TesseractResult {
  data: {
    text: string;
  };
}

const MyTesseractComponent: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const [result, setResult] = useState<string>('「カメラ開始」ボタンを押してOCRを開始してください。');
  const [language, setLanguage] = useState<string>('eng');
  
  // 処理ループを制御するためのID
  const intervalId = useRef<number | null>(null); 

  /**
   * カメラからのストリームを取得し、<video> 要素にバインドする
   */
  const startCamera = useCallback(async () => {
    if (typeof Tesseract === 'undefined') {
        setResult('エラー: Tesseract.js がロードされていません。');
        return;
    }

    try {
      // 1. カメラ映像の取得 (Web API)
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
        setResult('カメラ映像を取得しました。OCRを開始できます。');
      }
    } catch (err) {
      console.error('カメラへのアクセスエラー:', err);
      setResult('エラー: カメラにアクセスできませんでした。権限を確認してください。');
    }
  }, []);

  /**
   * ライブOCRの認識ループを開始する
   */
  const startOcrLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isRecognizing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
        setResult('エラー: Canvasコンテキストが取得できません。');
        return;
    }
    
    // 処理中にフラグを立てて、多重処理を防ぐ
    let isProcessing = false; 
    setIsRecognizing(true);
    setResult('ライブOCR認識開始...');
    
    // 認識処理のインターバル設定 (例: 1秒間に1回処理)
    const fps = 1; 
    const interval = 1000 / fps;

    const runRecognition = async () => {
        if (!isRecognizing || isProcessing) return; // 停止済み、または処理中ならスキップ

        isProcessing = true;
        
        // 1. CanvasのサイズをVideoに合わせる
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // 2. Videoの現在のフレームをCanvasに描画（抽出）
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
            // 3. Tesseract.jsによるOCRの実行
            const recognitionResult: TesseractResult = await Tesseract.recognize(
                canvas, // Canvas要素を直接渡す
                language,
                { 
                    logger: (m: { status: string, progress: number }) => {
                        if (m.status === 'recognizing') {
                            setResult(`認識中... (${Math.round(m.progress * 100)}%)`);
                        }
                    } 
                } 
            );
            
            // 4. 結果の表示
            const newText = recognitionResult.data.text.trim();
            if (newText) {
                setResult(newText);
            } else {
                setResult('文字が検出されませんでした。');
            }
            
        } catch (error) {
            console.error('OCR処理エラー:', error);
            const errorMessage = error instanceof Error ? error.message : '不明なエラー';
            setResult(`OCRエラー: ${errorMessage}`);
        } finally {
            isProcessing = false; // 処理完了
        }
    };
    
    // 💡 処理ループの開始
    intervalId.current = window.setInterval(runRecognition, interval);
    
  }, [isRecognizing, language]);

  /**
   * ストリームとOCRループを停止する
   */
  const stopAll = useCallback(() => {
    // 1. OCRインターバルの停止
    if (intervalId.current !== null) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
    setIsRecognizing(false);
    
    // 2. カメラストリームの停止
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setResult('カメラとOCR処理を停止しました。');
  }, []);

  // コンポーネントがアンマウントされたときに停止処理を実行
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);


  // レンダリング部分
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🎥 ライブカメラ OCR テスト</h1>
      <hr />

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={isStreaming ? stopAll : startCamera} 
          disabled={isRecognizing}
          style={{ padding: '8px 15px', backgroundColor: isStreaming ? '#dc3545' : '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '10px' }}
        >
          {isStreaming ? 'カメラ停止' : 'カメラ開始'}
        </button>
        
        <select 
          value={language} 
          onChange={(e) => setLanguage(e.target.value)}
          disabled={isRecognizing}
          style={{ padding: '5px', marginRight: '10px' }}
        >
            <option value="eng">英語 (eng)</option>
            <option value="jpn">日本語 (jpn)</option>
            <option value="jpn_vert">日本語 (縦書き jpn_vert)</option>
        </select>
        
        <button 
          onClick={isRecognizing ? stopAll : startOcrLoop} 
          disabled={!isStreaming || isRecognizing}
          style={{ padding: '8px 15px', backgroundColor: isRecognizing ? '#dc3545' : '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {isRecognizing ? 'OCR停止' : 'ライブOCR開始'}
        </button>
      </div>

      {/* 映像の表示エリア */}
      <div style={{ position: 'relative', marginBottom: '20px', border: '2px solid #333', overflow: 'hidden' }}>
        <video 
          ref={videoRef} 
          style={{ width: '100%', height: 'auto', display: isStreaming ? 'block' : 'none' }}
          autoPlay 
          muted // エコー防止のためミュート推奨
        />
        {/* OCR処理のための非表示Canvas */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        {!isStreaming && <div style={{ minHeight: '300px', backgroundColor: '#eee', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>カメラがオフです</div>}
      </div>

      {/* 認識結果の表示 */}
      <div style={{ marginBottom: '20px' }}>
        <h3>📜 認識結果</h3>
        <pre 
          style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', border: '1px dashed #ced4da', minHeight: '100px' }}
        >
          {isRecognizing ? `${result} \n...次の処理を待機中` : result}
        </pre>
      </div>
    </div>
  );
};

export default MyTesseractComponent;
