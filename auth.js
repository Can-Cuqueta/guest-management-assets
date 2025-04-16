const AUTH_ENDPOINT = '<?!= deploymentUrl ?>';

class Auth {
  static init() {
    // Clean URL if it contains token
    if (window.location.search.includes('token=')) {
      this._cleanUrl();
    }
  }

  static async check() {
    const token = this.getToken();
    if (!token) throw new Error('No token available');

    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(userData => {
          if (!userData) {
            this.clearSession();
            reject('Invalid token');
          } else {
            // Store user data separately from token
            sessionStorage.setItem('userData', JSON.stringify(userData));
            resolve(userData);
          }
        })
        .withFailureHandler(err => {
          this.clearSession();
          reject(err.message || 'Auth check failed');
        })
        .validateToken(token);
    });
  }

  static getToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    const storedToken = sessionStorage.getItem('authToken');
    
    // Persist URL token if present
    if (urlToken && urlToken !== storedToken) {
      sessionStorage.setItem('authToken', urlToken);
      this._cleanUrl();
    }

    return urlToken || storedToken;
  }

  static getUser() {
    const userData = sessionStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  }

  static clearSession() {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
  }

  static redirectToAuth() {
    window.location.href = `${AUTH_ENDPOINT}?type=auth`;
  }

  static _cleanUrl() {
    if (history.replaceState) {
      const cleanUrl = window.location.pathname + 
        window.location.search.replace(/([&?])token=[^&]*(&?)/i, (_, p1, p2) => 
          p2 ? p1 : ''
        );
      history.replaceState(null, '', cleanUrl);
    }
  }

  // Debug helper
  static debug() {
    return {
      token: this.getToken(),
      user: this.getUser(),
      url: window.location.href
    };
  }
}

// Initialize on load
Auth.init();
