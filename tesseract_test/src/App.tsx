import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Link } from 'react-router-dom';
import MyTesseractComponentMovie from './MyTesseractComponentMovie.tsx'
import MyTesseractComponent from './MyTesseractComponent.tsx'
import { Routes, Route } from 'react-router-dom';

function App() {

  return (
    <>
      <Routes>
	      <Route path="/movie" element={<MyTesseractComponentMovie/>} />
	      <Route path="/picture" element={<MyTesseractComponent/>} />
      </Routes>
      <div>
      <Link to="/picture">
          <img src={viteLogo} className="logo" alt="Vite logo" />
      </Link>
      <Link to="/movie">
          <img src={reactLogo} className="logo react" alt="React logo" />
      </Link>
      </div>
    </>
  )
}

export default App
