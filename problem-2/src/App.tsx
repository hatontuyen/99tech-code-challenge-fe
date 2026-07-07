import { SwapCard } from './components/SwapCard';

export default function App() {
  return (
    <div className="page">
      <div className="page__glow" aria-hidden="true" />
      <main className="page__main">
        <SwapCard />
        <p className="page__footnote">
          Prices are live from the Switcheo price feed · balances and execution
          are simulated for this demo
        </p>
      </main>
    </div>
  );
}
