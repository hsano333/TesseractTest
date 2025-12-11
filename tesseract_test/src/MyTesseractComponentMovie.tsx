// src/MyTesseractComponentMovie.tsx (修正版)

import React, { useState, useRef, useEffect, useCallback } from 'react';

// 💡 CDN経由で読み込んだグローバル変数 Tesseract の存在を宣言
declare const Tesseract: any; 

// Tesseract.js の認識結果オブジェクトの型定義（簡略化）
interface TesseractResult {
  data: {
    text: string;
  };
}

const MyTesseractComponentMovie: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const [result, setResult] = useState<string>('「カメラ開始」ボタンを押してOCRを開始してください。');
  const [language, setLanguage] = useState<string>('jpn');
  
  // 処理ループを制御するためのID
  // TypeScriptではwindow.setIntervalの戻り値はnumber型
  const intervalId = useRef<number | null>(null); 
  // OCR処理が現在進行中かどうかを追跡するフラグ
  const isOcrInProgress = useRef<boolean>(false); 

  /**
   * ストリームとOCRループを停止する（内部用）
   */
  const stopOcrLoop = useCallback(() => {
    if (intervalId.current !== null) {
      window.clearInterval(intervalId.current);
      intervalId.current = null;
    }
    setIsRecognizing(false);
    isOcrInProgress.current = false; // 確実にフラグをリセット
  }, []);

  const stopCameraAndOcr = useCallback(() => {
    stopOcrLoop();
    
    // カメラストリームの停止処理
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setResult('カメラとOCR処理を停止しました。');
  }, [stopOcrLoop]);

  /**
   * カメラからのストリームを取得し、<video> 要素にバインドする
   */
  const startCamera = useCallback(async () => {
    // 停止中のOCR処理があれば、ここで停止を試みる
    stopOcrLoop(); 

    try {
      //const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const stream = await navigator.mediaDevices.getUserMedia({ 
	      video:{
		    //exposureMode: "manual",
		    //whiteBalanceMode: "manual",
		    width: { ideal:  1920},   // 理想値
		    height: { ideal:  1080},  // 理想値
		    facingMode: { ideal: "environment" }
	      }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // カメラが起動するのを待つ
        await videoRef.current.play(); 
        
        setIsStreaming(true);
        setResult('カメラ映像を取得しました。OCRを開始できます。');
      }
    } catch (err) {
      console.error('カメラへのアクセスエラー:', err);
      setResult('エラー: カメラにアクセスできませんでした。権限を確認してください。');
    }
  }, [stopOcrLoop]);


  /**
   * ライブOCRの認識ループを開始する
   */
  const startOcrLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isRecognizing) return;
    
    // Tesseractがグローバルに存在するか確認（CDNのロード確認）
    if (typeof Tesseract === 'undefined' || typeof Tesseract.recognize !== 'function') {
        setResult('エラー: Tesseract.js のロードに失敗しているか、ブロックされています。');
        return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;
    
    setIsRecognizing(true);
    setResult('ライブOCR認識開始...');
    
    // 処理頻度を設定 (例: 1秒間に1回)
    const fps = 1; 
    const interval = 1000 / fps;

    const runRecognition = async () => {
        // 処理中の場合はスキップし、多重実行を防ぐ
        if (isOcrInProgress.current) {
            console.log('前回のOCR処理が完了していないためスキップ');
            return;
        }

        isOcrInProgress.current = true; // 処理開始フラグを立てる
        
        // CanvasのサイズをVideoに合わせる
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

	/*
	const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
	for (let i = 0; i < imgData.data.length; i += 4) {
	  const avg = (imgData.data[i] + imgData.data[i+1] + imgData.data[i+2]) / 3;
	  imgData.data[i] = imgData.data[i+1] = imgData.data[i+2] = avg;
	}
	*/
	//ctx.putImageData(imgData, 0, 0);
        
        // Videoの現在のフレームをCanvasに描画（抽出）
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

	//前処理
	    let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	    const data = imgData.data;

	    // グレースケール + コントラスト強調
	    const contrast = 1.2; // 1.0で変化なし。1.2〜1.8がオススメ
	    for (let i = 0; i < data.length; i += 4) {
	      // grayscale
	      const v = (data[i] + data[i + 1] + data[i + 2]) / 3;

	      // contrast
	      const c = (v - 128) * contrast + 128;

	      data[i] = data[i + 1] = data[i + 2] = c;
	    }
	    ctx.putImageData(imgData, 0, 0);


        //context.drawImage(imgData, 0, 0, canvas.width, canvas.height);

        try {
            // Tesseract.jsによるOCRの実行
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
            
            // 結果の表示
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
            isOcrInProgress.current = false; // 処理完了フラグをリセット
        }
    };
    
    // 💡 処理ループの開始
    // 最初の実行はすぐに、その後はインターバルで繰り返す
    runRecognition();
    intervalId.current = window.setInterval(runRecognition, interval);
    
  }, [isRecognizing, language]);

  // コンポーネントがアンマウントされたときに停止処理を実行
  useEffect(() => {
    return () => {
      stopCameraAndOcr();
    };
  }, [stopCameraAndOcr]);


  // レンダリング部分
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🎥 ライブカメラ OCR テスト (修正版)</h1>
      <hr />

      <div style={{ marginBottom: '20px' }}>
        {/* カメラ開始・停止ボタン */}
        <button 
          onClick={isStreaming ? stopCameraAndOcr : startCamera} 
          disabled={isRecognizing && isStreaming}
          style={{ padding: '8px 15px', backgroundColor: isStreaming ? '#dc3545' : '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '10px' }}
        >
          {isStreaming ? 'カメラ/OCR停止' : 'カメラ開始'}
        </button>
        
        <select 
          value={language} 
          onChange={(e) => setLanguage(e.target.value)}
          disabled={isRecognizing}
          style={{ padding: '5px', marginRight: '10px' }}
        >
            <option value="jpn">日本語 (jpn)</option>
            <option value="jpn_vert">日本語 (縦書き jpn_vert)</option>
            <option value="eng">英語 (eng)</option>
        </select>
        
        {/* ライブOCR開始ボタン */}
        <button 
          onClick={isRecognizing ? stopOcrLoop : startOcrLoop} 
          disabled={!isStreaming || isRecognizing || isOcrInProgress.current}
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
          muted 
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
          {isRecognizing ? `${result} \n(処理頻度: 1秒に1回)` : result}
        </pre>
      </div>
    </div>
  );
};

export default MyTesseractComponentMovie;
