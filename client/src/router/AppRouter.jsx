import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { RootLayout } from '../layouts/RootLayout';// without the react provider, the router will not work properly , like the url will change but the page will not change, so we need to wrap the router with the provider
import { HomePage } from '../pages/HomePage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
//without axios You have to manually parse the response. axios will automatically parse the response and return the data in the format you expect. This can save you a lot of time and effort when working with APIs.