import React, {Suspense} from 'react';
import {RecoilRoot} from 'recoil';
import MainComponent from './view/MainComponent';
import './App.css';

export default function App() {
  return (
    <RecoilRoot>
      <Suspense fallback={(<div className="App">Загрузка...</div>)}>
        <MainComponent />
      </Suspense>
    </RecoilRoot>
  );
}