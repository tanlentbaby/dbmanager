import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Databases from './pages/Databases'
import Query from './pages/Query'
import Bookmarks from './pages/Bookmarks'
import History from './pages/History'
import Settings from './pages/Settings'
import ERD from './pages/ERD'
import Favorites from './pages/Favorites'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="databases" element={<Databases />} />
        <Route path="query" element={<Query />} />
        <Route path="erd" element={<ERD />} />
        <Route path="bookmarks" element={<Bookmarks />} />
        <Route path="history" element={<History />} />
        <Route path="favorites" element={<Favorites />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
