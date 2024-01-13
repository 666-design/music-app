List of files and their purpose:

server.js: The file is a server script for an online art gallery application. It utilizes modules like Express, Mongoose, and Bcrypt to manage web server functionalities, database interactions, and user authentication. The script includes features such as user registration and login, session management, password hashing, and rendering various pages using Pug templates. It also handles displaying and managing artwork and artist information, including liking, reviewing, and following artists. Users can search for artworks by title, category, or artist, and upgrade their accounts to artist status. The server is configured to listen on a specific port for incoming requests.

artistPage.pug: a Pug template for artist pages.

artworkDetail.pug: a Pug template for displaying detailed information about artworks.

browseArtworks.pug: a Pug template allows users to browse and filter artworks in an art gallery.

dashboard.pug: a Pug template for a dashboard page for the online art gallery.

layout.pug: a Pug template for the basic layout structure used in the online art gallery.

login.pug: a Pug template for the login page.

myProfile.pug: a Pug template for the user profile page. 

register.pug: a Pug template for the registration page.

searchArtists.pug: a Pug template for a page where users can search for artists.

SearchArtworkCategory.pug: a Pug template for a web page dedicated to searching artworks by category in the online art gallery.

searchArtworkTitle.pug: a Pug template for a page that allows users to search for artworks by title.

searchResults.pug: a Pug template for displaying search results.

updateAccountInformation.pug: a Pug template for a page where users can update their account information. 

upgradeAccount.pug: a Pug template for a page where users can upgrade their accounts. 

welcome.pug: a Pug template for the welcome page.

gallery.json: database.



3. Detailed steps explaining how to install, initialize, and run your database and server.

step 1. Open MongoDB, and make a database called "ArtGallery".
step 2. In this database, write 2 collections, one named "artworks" and the other one named "users".
step 3. unzip the YanxiLi-project.zip.
step 4. Open the terminal.
step 5. navigate to the YanxiLi-project file path.
step 6. Type npm init and npm install express.
step 7. Type node server.js.
step 8. Open a browser and go to http://localhost:3000/.
step 9. Start testing the project.



4. Discussion and critique of your overall design.

I think I did everything at least correctly besides the artist part, but the design of each page can be more beautiful.

The use of MongoDB and Mongoose is suitable for scalability but might require further optimization for large datasets.
Session management and user authentication are essential but need secure implementation to avoid vulnerabilities.
Templating with Pug is efficient for server-side rendering, but client-side rendering might be considered for dynamic content to reduce server load.
The application lacks middleware for caching or compression, which could improve latency and performance.
For better scalability and reduced latency, consider implementing caching, optimizing database queries, and using a load balancer. Also, ensuring code modularity and efficient error handling will aid in maintaining and scaling the application.



5. Explanation of any design decisions that you made and description of extra functionality. 

I just followed the instructions and did the project step by step, It may not be very good, but it can achieve basic functions.
I made the users log out from the dashboard easier.
Key decisions include:

MongoDB with Mongoose: Chosen for flexibility and scalability in handling document-based data, suitable for the dynamic and varied data types in an art gallery platform.

User Authentication with bcrypt and express-session: Ensuring user data security with bcrypt for hashing passwords and express-session for managing user sessions.

Pug Templating Engine: Selected for server-side rendering, providing a streamlined way to generate HTML views and manage dynamic content.

Express.js Framework: Facilitates rapid development and provides a robust set of features for web and mobile applications.

Modular Route Handling: Organizing different functionalities (like user registration, artwork management) into separate routes enhances code maintainability and readability.



6. List any known errors or control sequences that work not as expected or crash your code:

The "log out" button may not work correctly if you are using a newer version of Mongoose (5.x and above), this method no longer accepts a callback function in newer versions of Mongoose.
