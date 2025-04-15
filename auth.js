// auth.js - Centralized authentication logic
function checkAuth() {
  return new Promise((resolve, reject) => {
    const token = new URLSearchParams(window.location.search).get('token') || 
                 sessionStorage.getItem('authToken');
    
    if (!token) {
      reject('No token found');
      return;
    }

    google.script.run
      .withSuccessHandler((userData) => {
        if (userData) {
          // Store token if it came from URL
          if (new URLSearchParams(window.location.search).has('token')) {
            sessionStorage.setItem('authToken', token);
          }
          resolve(userData);
        } else {
          reject('Invalid token');
        }
      })
      .withFailureHandler(reject)
      .validateToken(token);
  });
}

function redirectToAuth() {
  sessionStorage.removeItem('authToken');
  window.location.href = `<?= deploymentUrl ?>?type=auth`;
}
