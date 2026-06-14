// Single source of truth for the backend base URL.
//
// Previously this same ternary was copy-pasted into a dozen components, contexts and
// utilities (some with the window.location.origin fallback, some without). Centralizing
// it here removes that duplication and guarantees every caller resolves the URL the
// same way.
//
// - development: talk to the local backend on :5000
// - production:  use the build-time REACT_APP_API_URL, falling back to the current
//                origin if it wasn't provided (safer than an undefined base URL)
const API_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000'
  : process.env.REACT_APP_API_URL || window.location.origin;

export default API_URL;
