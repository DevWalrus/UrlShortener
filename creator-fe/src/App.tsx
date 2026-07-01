import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import Layout from './components/Layout'
import Create from './pages/Create'
import Home from './pages/Home'
import List from './pages/List'
import NotFound from './pages/NotFound'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'create', element: <Create /> },
      { path: 'list', element: <List /> },
      { path: '404', element: <NotFound /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" richColors />
    </>
  )
}