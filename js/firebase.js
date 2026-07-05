/* ===================================================================
   RICHARD RICH — firebase.js
   Thin helper layer over Firebase (compat SDK). Everything the site
   needs is exposed on window.RR. Degrades gracefully when not yet
   configured, so the site never breaks before Firebase is set up.
   =================================================================== */
(function () {
  'use strict';
  const cfg = window.FIREBASE_CONFIG || {};
  const RR = (window.RR = window.RR || {});
  RR.configured = !!(cfg.apiKey && cfg.projectId && typeof firebase !== 'undefined');

  if (!RR.configured) {
    // Stubs so callers can run without crashing before setup is done.
    RR.googleSignIn = () => Promise.reject(new Error('not-configured'));
    RR.signOut = () => Promise.resolve();
    RR.saveBooking = () => Promise.reject(new Error('not-configured'));
    RR.ownerLogin = () => Promise.reject(new Error('not-configured'));
    RR.getBookings = () => Promise.reject(new Error('not-configured'));
    RR.onAuth = (cb) => { cb(null); return () => {}; };
    RR.updateStatus = () => Promise.resolve();
    return;
  }

  firebase.initializeApp(cfg);
  const auth = firebase.auth();
  const db = firebase.firestore();
  // keep users (and the owner) signed in across visits
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

  RR.auth = auth;
  RR.db = db;

  RR.googleSignIn = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
  RR.signOut = () => auth.signOut();
  RR.onAuth = (cb) => auth.onAuthStateChanged(cb);

  RR.saveBooking = (data) =>
    db.collection('bookings').add(
      Object.assign({}, data, {
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'new',
      })
    );

  // Owner-only. Firestore security rules restrict reads to the owner email,
  // so this genuinely can't return data for anyone else.
  RR.ownerLogin = (email, pass) => auth.signInWithEmailAndPassword(email, pass);
  RR.getBookings = () => db.collection('bookings').orderBy('createdAt', 'desc').get();
  RR.updateStatus = (id, status) => db.collection('bookings').doc(id).update({ status });
  RR.deleteBooking = (id) => db.collection('bookings').doc(id).delete();
})();
