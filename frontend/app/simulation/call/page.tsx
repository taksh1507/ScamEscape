import CallSimulation from '@/components/sections/CallSimulation'
import CursorEffect from '@/components/ui/CursorEffect'
 
export const metadata = {
  title: 'Scam Escape AI — Call Simulation',
  description: 'Easy level: identify and respond to a live phone scam.',
}
 
export default function CallSimulationPage() {
  return (
    <>
      <CursorEffect />
      <CallSimulation />
    </>
  )
}
 