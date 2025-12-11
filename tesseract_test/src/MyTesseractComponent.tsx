
// src/MyTesseractComponent.tsx

import React, { useState, useCallback, useMemo } from 'react';

// 💡 CDN経由で読み込んだグローバル変数 Tesseract の存在を宣言
declare const Tesseract: any; 

// Tesseract.js の認識結果オブジェクトの型定義（簡略化）
interface TesseractResult {
  data: {
    text: string;
  };
}

const MyTesseractComponent: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<string>('画像ファイルを選択し、「OCR開始」ボタンを押してください。');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [language, setLanguage] = useState<string>('eng'); // 認識言語の状態

  /**
   * ファイル入力が変更されたときのハンドラー
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // 複数のファイルが選択された可能性を考慮して最初のファイルを取得
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
      setResult(`ファイル名: ${file.name} を選択しました。`);
    } else {
      setResult('画像ファイルを選択し、「OCR開始」ボタンを押してください。');
    }
  };

  /**
   * Tesseract.jsによる認識処理を実行する関数
   */
  const recognizeImage = useCallback(async () => {
    // 1. Tesseract のロードとファイル選択の確認
    if (typeof Tesseract === 'undefined') {
        setResult('エラー: Tesseract.js がロードされていません。index.htmlを確認してください。');
        return;
    }
    if (!selectedFile) {
        setResult('エラー: 認識を開始する前に画像ファイルを選択してください。');
        return;
    }
    
    setIsLoading(true);
    setResult('認識中...');

    try {
      // 2. 認識の実行
      // Tesseract.js は File, Blob, URL など様々な形式を直接受け付けます。
      const recognitionResult: TesseractResult = await Tesseract.recognize(
        selectedFile,
        language, // 選択された言語
        { 
          logger: (m: { status: string, progress: number }) => {
            // 進捗をユーザーに表示
            if (m.status === 'recognizing') {
                setResult(`認識中... (${Math.round(m.progress * 100)}%)`);
            }
          } 
        } 
      );
      
      // 3. 結果の表示
      setResult(recognitionResult.data.text);
      
    } catch (error) {
      console.error('Tesseract 認識エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      setResult(`エラーが発生しました: ${errorMessage}`);
      
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, language]);


  /**
   * アップロードされた画像のプレビューURLを生成
   */
  const imagePreviewUrl = useMemo(() => {
    if (selectedFile) {
      return URL.createObjectURL(selectedFile);
    }
    return null;
  }, [selectedFile]);

  // 4. UIのレンダリング
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>📸 画像アップロード & OCR テスト</h1>
      <hr />

      <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
        <h3>ファイル選択</h3>
        <input 
          type="file" 
          accept="image/*" // 画像ファイルのみを受け付ける
          onChange={handleFileChange} 
          style={{ marginRight: '10px' }}
        />
        
        <select 
          value={language} 
          onChange={(e) => setLanguage(e.target.value)}
          style={{ padding: '5px', marginRight: '10px' }}
          disabled={isLoading}
        >
            <option value="eng">英語 (eng)</option>
            <option value="jpn">日本語 (jpn)</option>
            <option value="jpn_vert">日本語 (縦書き jpn_vert)</option>
            <option value="kor">韓国語 (kor)</option>
        </select>

        <button 
          onClick={recognizeImage} 
          disabled={isLoading || !selectedFile}
          style={{ padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {isLoading ? 'OCR実行中...' : 'OCR開始'}
        </button>
      </div>
      
      {/* 選択された画像のプレビュー */}
      {imagePreviewUrl && (
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <h3>プレビュー</h3>
          <img 
            src={imagePreviewUrl} 
            alt="Uploaded Preview" 
            style={{ maxWidth: '100%', maxHeight: '300px', border: '1px solid #ddd' }}
          />
        </div>
      )}

      {/* 認識結果の表示 */}
      <div style={{ marginBottom: '20px' }}>
        <h3>📜 認識結果</h3>
        {isLoading && <p>Tesseract.js が画像を解析しています... (進捗はログに出力されます)</p>}
        <pre 
          style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', border: '1px dashed #ced4da' }}
        >
          {result}
        </pre>
      </div>
    </div>
  );
};

export default MyTesseractComponent;
