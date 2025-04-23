const AUTH_ENDPOINT = '<?!= deploymentUrl ?>';
const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_REFRESH_ATTEMPTS = 3;


class Auth {
  static init() {
      
    // Clean URL if it contains token

    console.log ('---------- IN auth.js, init  --------');
  
    console.log("Auth initialization", this.logState());
    
    
    if (window.location.search.includes('token=')) {

      console.log ('token= is true, call cleanUrl()');
        
      this._cleanUrl();
    }
    
    // Initialize heartbeat if token exists
    if (this.getToken()) {
        
      console.log ('this.getToken() is true, call _startHeartbeat()');
        
      this._startHeartbeat();
    }
    
    // Setup cross-tab communication
    window.addEventListener('storage', this._handleStorageEvent.bind(this));


    console.log("Auth DONE, leaving auth.js");

  }

  static async check() {
    const token = this.getToken();
    if (!token) throw new Error('No token available');

    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(userData => {
          if (!userData) {
            this.clearSession();
            reject(new Error('Invalid token'));
          } else {
            sessionStorage.setItem('userData', JSON.stringify(userData));
            resolve(userData);
          }
        })
        .withFailureHandler(err => {
          this.clearSession();
          reject(new Error(err.message || 'Auth check failed'));
        })
        .validateToken(token);
    });
  }




static getToken() {

  console.log ('---------- IN auth.js, getToken  +--------');
  

  // 1. Check for injected token first
  if (window._initialToken) {

    console.log ('---------- IN auth.js, gettoken(), Check for injected token first...' + ' --------');

    sessionStorage.setItem('authToken', window._initialToken);
    
    delete window._initialToken;
  }

  // 1. Log raw values WITHOUT method calls
  const debugData = {
    urlToken: new URLSearchParams(window.location.search).get('token'),
    storedToken: sessionStorage.getItem('authToken'),
    lastUpdate: sessionStorage.getItem('lastTokenUpdate')
  };
  
  console.table(debugData);
  

  // 2. Original logic (unchanged)
  
  const urlToken = debugData.urlToken; // Reuse from debug
  
  if (urlToken) {

    console.log ('---------- IN auth.js, gettoken(), Storing URL token...' + ' --------');

    sessionStorage.setItem('authToken', urlToken);
    sessionStorage.setItem('lastTokenUpdate', Date.now());
    this._cleanUrl();
    return urlToken;
  }

  console.log ('---------- IN auth.js, gettoken(), return debugData.storedToken: ' + debugData.storedToke + ' --------');


  return debugData.storedToken; // Reuse from debug
}


static logState(context = '') {
  // SAFE debug - doesn't call other Auth methods
  return {
    context,
    timestamp: new Date().toISOString(),
    storage: {
      authToken: sessionStorage.getItem('authToken'),
      userData: sessionStorage.getItem('userData')
    },
    urlToken: new URLSearchParams(window.location.search).get('token'),
    url: window.location.href,
    // Add other raw data you need
    heartbeatActive: !!this._heartbeatInterval
  };
}

  
  

  static getUser() {
    const userData = sessionStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  }

  static clearSession() {
    this._stopHeartbeat();
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    
    // Notify other tabs
    localStorage.setItem('authToken_clear', Date.now());
    setTimeout(() => localStorage.removeItem('authToken_clear'), 100);
  }

  static redirectToAuth() {
    window.location.href = `${AUTH_ENDPOINT}?type=auth`;
  }

  static async refreshToken() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const result = await new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .extendToken(token);
      });
      
      if (!result) {
        throw new Error('Token refresh rejected by server');
      }
      return true;
    } catch (error) {
      console.warn('Token refresh failed:', error);
      this._refreshAttempts = (this._refreshAttempts || 0) + 1;
      
      if (this._refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        this.clearSession();
      }
      throw error;
    }
  }

  static _startHeartbeat() {
    this._stopHeartbeat();
    this._heartbeatInterval = setInterval(async () => {
      try {
        await this.refreshToken();
        this._refreshAttempts = 0; // Reset on success
      } catch (error) {
        console.warn('Heartbeat failed:', error);
      }
    }, TOKEN_REFRESH_INTERVAL);
  }

  static _stopHeartbeat() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }
  }

  static _handleStorageEvent(event) {
    // Handle cross-tab logout
    if (event.key === 'authToken_clear') {
      this._stopHeartbeat();
      sessionStorage.clear();
      this.redirectToAuth();
    }
  }

  static _cleanUrl() {

    console.log ('---------- IN auth.js, cleanUrl()  --------');

    if (history.replaceState && window.location.search.includes('token=')) {
      const cleanUrl = window.location.pathname + 
        window.location.search.replace(/([&?])token=[^&]*(&?)/i, (_, p1, p2) => 
          p2 ? p1 : ''
        );

      console.log ('---------- IN auth.js, cleanUrl: ' +  cleanUrl + '--------');

      history.replaceState(null, '', cleanUrl);
    }


    
  }

  static debug() {
    return {
      token: this.getToken(),
      user: this.getUser(),
      url: window.location.href,
      heartbeatActive: !!this._heartbeatInterval,
      refreshAttempts: this._refreshAttempts || 0
    };
  }
}

// Initialize on load
Auth.init();
