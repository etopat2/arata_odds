import React from 'react';
import {createRoot} from 'react-dom/client';
import Home from '../app/page';
import '../app/globals.css';
class AppBoundary extends React.Component<React.PropsWithChildren, {error:boolean}> {
 state={error:false};
 static getDerivedStateFromError(){return {error:true};}
 componentDidCatch(error:Error){console.error('Arata screen failed:',error);}
 render(){return this.state.error?<main><h1>Arata Odds</h1><p>This screen could not load. Your saved records remain in the database.</p><button onClick={()=>location.reload()}>Reload app</button></main>:this.props.children;}
}
createRoot(document.getElementById('root')!).render(<AppBoundary><Home/></AppBoundary>);
