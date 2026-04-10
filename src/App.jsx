import { Navigate, Route, Routes } from 'react-router-dom'
import AdminPage from './pages/AdminPage'
import ClientPage from './pages/ClientPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ClientPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
