console.log('DEBUG ENTRY POINT LOADED');
const root = document.getElementById('root');
if (root) {
    root.innerHTML = '<div style="background: green; color: white; font-size: 30px; height: 100vh; display: flex; align-items: center; justify-content: center;">JS BUNDLE EXECUTED SUCCESSFULLY</div>';
} else {
    document.body.innerHTML += '<div style="background: orange; color: black;">ROOT MISSING BUT JS RAN</div>';
}
