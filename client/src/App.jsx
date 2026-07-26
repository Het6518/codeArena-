import { AppRouter } from './router/AppRouter';

function App() {
  return <AppRouter />;
}

export default App;


/*
Browser
    │
    ▼
index.html
    │
    ▼
main.jsx
    │
    ▼
<App />
    │
    ▼
<AppRouter />
    │
    ▼
RouterProvider
    │
    ▼
Match URL "/"
    │
    ▼
RootLayout
    │
    ▼
Outlet
    │
    ▼
HomePage
    │
    ▼
ProblemList
    │
    ▼
ProblemCard
*/

/*
HomePage
      │
      ▼
Axios GET /problems
      │
      ▼
Request Interceptor
      │
      ▼
Express
      │
      ▼
Controller
      │
      ▼
Service
      │
      ▼
Prisma
      │
      ▼
PostgreSQL
      │
      ▼
JSON Response
      │
      ▼
Axios Response Interceptor
      │
      ▼
setProblems(...)
      │
      ▼
React Re-render
      │
      ▼
Updated UI
*/
/*
axios is a promise-based HTTP client for the browser and Node.js. It makes it easy to send asynchronous HTTP requests to REST endpoints and perform CRUD operations. It also supports the Promise API that is native to JS .
*/