import React, {Suspense} from 'react';
import {RecoilRoot} from 'recoil';
import MainComponent from './view/MainComponent';
import './App.css';
import {BrowserRouter, Route, Routes} from 'react-router-dom';

export default function App() {
  return (
    <RecoilRoot>
      <Suspense fallback={(<div className="App">Загрузка...</div>)}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainComponent isTest={false} />} />
            <Route path="/test" element={<MainComponent isTest={true} />} />
          </Routes>
        </BrowserRouter>
      </Suspense>
    </RecoilRoot>
  );
}