
    document.getElementById("login-form").addEventListener("submit", function (event) {
        event.preventDefault();

        const form = event.target;
        const username = form.elements.username.value;
        const password = form.elements.password.value;

        const errorElement = document.getElementById("error");
        errorElement.textContent = "";

        const credentials = {
            username: username,
            password: password
        };

        fetch("http://localhost:8080/auth/login", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(credentials)
        })
            .then(function (res) {
                if (!res.ok || res.status >= 400) {
                    throw new Error("Login failed.");
                }
                return res.json();
            })
            .then(function (data) {
                if (data && data.loggedIn) {
                    const socket = io(); // Establish Socket.IO connection

                    socket.on("connect", function () {
                        console.log("Socket.IO connected");
                        // Perform additional actions or emit events
                        redirectToHome();
                    });
                } else if (data && data.status) {
                    errorElement.textContent = data.status;
                }
            })
            .catch(function (error) {
                console.error(error);
            });
    });


function redirectToHome() {
    window.location.href = 'http://localhost:8080/';
}
