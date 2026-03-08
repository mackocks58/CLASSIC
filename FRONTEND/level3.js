const firebaseConfig = {
    apiKey: "AIzaSyAIX3aQq3VEBq269Jdrk77CefNttqAR51s",
  authDomain: "mozambique-newhope.firebaseapp.com",
  databaseURL: "https://mozambique-newhope-default-rtdb.firebaseio.com",
  projectId: "mozambique-newhope",
  storageBucket: "mozambique-newhope.firebasestorage.app",
  messagingSenderId: "133563964959",
  appId: "1:133563964959:web:d3f183b721d540140f7f2a",
  measurementId: "G-FY6CNVX6ZK"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// Get loading spinner element
const loadingSpinner = document.getElementById("loadingSpinner");

// Modal functionality
const modal = document.getElementById("searchModal");
const btn = document.getElementById("searchButton");
const span = document.getElementsByClassName("close")[0];

btn.onclick = function() {
  modal.style.display = "block";
}

span.onclick = function() {
  modal.style.display = "none";
}

window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function displayReferrals(referrals = null) {
  const user = auth.currentUser;
  if (!user) return;

  const list = document.getElementById("referrals-list");
  list.innerHTML = "";

  // Show loading spinner
  loadingSpinner.style.display = "flex";

  database.ref(`users/${user.uid}`).once("value").then(snapshot => {
    const userData = snapshot.val();
    const level3Refs = userData.level3 ? Object.values(userData.level3) : [];

    database.ref("deposits").once("value").then(depositSnap => {
      const deposits = depositSnap.exists() ? Object.values(depositSnap.val()) : [];

      if (level3Refs.length === 0) {
        list.innerHTML = "<tr><td colspan='5'>No referral yet!</td></tr>";
        // Hide loading spinner when data is loaded
        loadingSpinner.style.display = "none";
        return;
      }

      Promise.all(level3Refs.map(refId =>
        database.ref(`users/${refId}`).once("value").then(snap => {
          const data = snap.val();
          return { id: refId, ...data };
        })
      )).then(refUsers => {
        list.innerHTML = "";
        
        // If referrals parameter is provided, filter the results
        const displayUsers = referrals 
          ? refUsers.filter(user => referrals.includes(user.id))
          : refUsers;

        if (displayUsers.length === 0) {
          list.innerHTML = "<tr><td colspan='5'>No matching referrals found</td></tr>";
          // Hide loading spinner when data is loaded
          loadingSpinner.style.display = "none";
          return;
        }

        displayUsers.forEach((refUser, i) => {
          const deposit = deposits.find(d => d.userId === refUser.id);
          
          let status = "";
          let statusClass = "status-pending";
          let statusIcon = "⛔";

          if (deposit) {
            status = deposit.status || "Pending";
            
            if (typeof status === 'string' && status.trim().toLowerCase() === 'approved') {
              status = "";
              statusClass = "status-approved";
              statusIcon = "✅";
            }
          }

          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${i + 1}</td>
            <td>${refUser.phone || "None"}</td>
            <td>${refUser.signupDate || "None"}</td>
          `;
          list.appendChild(row);
        });

        // Hide loading spinner when data is loaded
        loadingSpinner.style.display = "none";
      });
    });
  });
}

function searchByDate() {
  const dateInput = document.getElementById("dateSearch").value;
  if (!dateInput) {
    alert("Please enter a date");
    return;
  }

  const searchDate = new Date(dateInput);
  const searchDateStr = searchDate.toISOString().split('T')[0];
  
  const user = auth.currentUser;
  if (!user) return;

  const resultsDiv = document.getElementById("searchResults");
  resultsDiv.innerHTML = "Searching...";

  database.ref(`users/${user.uid}`).once("value").then(snapshot => {
    const userData = snapshot.val();
    const level3Refs = userData.level3 ? Object.values(userData.level3) : [];

    if (level3Refs.length === 0) {
      resultsDiv.innerHTML = "No referrals found";
      return;
    }

    Promise.all(level3Refs.map(refId =>
      database.ref(`users/${refId}`).once("value").then(snap => {
        const data = snap.val();
        return { id: refId, ...data };
      })
    )).then(refUsers => {
      const matchingUsers = refUsers.filter(user => {
        if (!user.signupDate) return false;
        const userDate = new Date(user.signupDate).toISOString().split('T')[0];
        return userDate === searchDateStr;
      });

      resultsDiv.innerHTML = "";
      
      if (matchingUsers.length === 0) {
        resultsDiv.innerHTML = "No referrals found for this date";
        return;
      }

      const resultList = document.createElement("div");
      matchingUsers.forEach((user, i) => {
        const userDiv = document.createElement("div");
        userDiv.style.padding = "10px";
        userDiv.style.borderBottom = "1px solid #eee";
        userDiv.innerHTML = `
          <strong>${i + 1}. ${user.username || "No name"}</strong><br>
          Phone: ${user.phone || "None"}<br>
          Date: ${user.signupDate ? formatDate(user.signupDate) : "N/A"}
        `;
        resultList.appendChild(userDiv);
      });

      const showAllButton = document.createElement("button");
      showAllButton.textContent = "Show All Matching in Table";
      showAllButton.className = "search-button";
      showAllButton.style.marginTop = "10px";
      showAllButton.onclick = function() {
        // Show loading spinner before displaying filtered results
        loadingSpinner.style.display = "flex";
        displayReferrals(matchingUsers.map(u => u.id));
        modal.style.display = "none";
      };

      resultsDiv.appendChild(resultList);
      resultsDiv.appendChild(showAllButton);
    });
  });
}

auth.onAuthStateChanged(user => {
  if (user) {
    displayReferrals();
  } else {
    window.location.href = "/index.html";
  }
});