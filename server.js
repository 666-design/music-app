const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const app = express();
const flash = require('connect-flash');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/ArtGallery');

// Set up session middleware
app.use(session({
    secret: 'secret key', 
    resave: false,
    saveUninitialized: true
  }));


// Middleware to check active session
async function checkActiveSession(req, res, next) {
  const user = await User.findById(req.session.userId);
  if (user && user.activeSessionId !== req.session.id) {
    return res.redirect('/login');
  }
  next();
}

app.use(flash()); // Set up connect-flash middleware

// Use Pug as the template engine
app.set('view engine', 'pug');

// Set the views directory
app.set('views', path.join(__dirname, 'views'));

// Body parser middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  isArtist: { type: Boolean, default: false }, // By default, users are patrons
  activeSession: { type: String, default: null } // New field to store active session ID
});

const ArtworkSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId, 
  Title: String,
  Artist: String,
  Year: String,
  Category: String,
  Medium: String,
  Description: String,
  Poster: String,
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of user IDs who liked the artwork
  reviews: [{ // Array of review objects
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    date: { type: Date, default: Date.now }
  }]
});

const Artwork = mongoose.model('Artwork', ArtworkSchema, 'artworks');
module.exports = Artwork;

// Password hashing middleware
UserSchema.pre('save', function(next) {
  if (this.isModified('password')) {
    this.password = bcrypt.hashSync(this.password, 12);
  }
  next();
});

UserSchema.add({
  followedArtists: [String], // Stores an array of artist names as strings
  notifications: [{
    message: String,
    date: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false }
  }]
});

// Helper method to validate password
UserSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compareSync(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);

// Root route to render the welcome page
app.get('/', (req, res) => {
    res.render('welcome');
  });
  
// GET route for the registration page
app.get('/register', (req, res) => {
  res.render('register');
});

// POST route for user registration
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const newUser = new User({ username, password });
    await newUser.save();

    // Set session user ID after successful registration
    req.session.userId = newUser._id;

    // Redirect to the dashboard route
    res.redirect('/dashboard');
  } catch (error) {
    // Handle any errors during registration
    console.error(error);
    res.status(500).send('Error registering new user');
  }
});
  
  // Login route
  app.get('/login', (req, res) => {
    res.render('login');
  });
  
  app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && user.comparePassword(password)) {
      req.session.userId = user._id;
      // Update activeSessionId in the database
      await User.findByIdAndUpdate(user._id, { activeSessionId: req.session.id });
      res.redirect('/dashboard');
    } else {
      res.status(401).send('Invalid credentials');
    }
  });  

  // Route for the dashboard
  app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) {
      return res.redirect('/login'); // If not logged in, redirect to the login page
    }
  
    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        req.session.destroy(() => {
          res.redirect('/login');
        });
      } else {
        // Assuming user.followedArtists is an array of artist names
        const followedArtists = user.followedArtists || [];
        const likedArtworks = await Artwork.find({ likes: user._id }); // Fetches all artworks liked by the user

        console.log('Followed Artists:', followedArtists);
  
        // Render the dashboard with the user object and followed artists
        res.render('dashboard', { user: user, followedArtists: followedArtists , likedArtworks: likedArtworks});
      }
    } catch (error) {
      res.status(500).send('An error occurred while loading the dashboard');
    }
  });  

  app.get('/upgrade-account', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('You must be logged in to upgrade your account');
    }

    try {
        // Fetch the user from the database using the userId from the session
        const user = await User.findById(req.session.userId);

        if (!user) {
            return res.status(404).send('User not found');
        }

        // Render the upgrade account confirmation page
        res.render('upgradeAccount');
    } catch (error) {
        res.status(500).send('An error occurred while retrieving user information');
    }
    });
  
  
  app.post('/upgrade-account', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).send('You must be logged in to upgrade your account');
    }
  
    try {
      const user = await User.findById(req.session.userId);
      user.isArtist = true; // Set the isArtist flag to true to upgrade the account
      await user.save();
      req.flash('success', 'Account successfully upgraded to artist.'); // Add flash message
      res.redirect('/dashboard'); // Redirect back to the dashboard or to an artist-specific page
    } catch (error) {
      res.status(500).send('An error occurred while upgrading the account');
    }
  });

  app.get('/browse-artworks', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login'); // Redirect to login if not logged in
    }

    try {
        const artworks = await Artwork.find({}); // Fetch all artworks from the database
        res.render('browseArtworks', { artworks: artworks }); // Render the browse artworks page with the fetched artworks
    } catch (error) {
        res.status(500).send('An error occurred while fetching artworks');
    }
});

// POST route to handle the search and display results
app.post('/search-artists', async (req, res) => {
  const artistName = req.body.artistName;

  try {
    // Search for artworks by this artist (case insensitive)
    const artworks = await Artwork.find({ Artist: new RegExp(artistName, 'i') });

    // Fetch the logged-in user
    const user = await User.findById(req.session.userId);

    // If artworks by this artist are found, render the artist page with these artworks
    if (artworks.length > 0) {
      res.render('artistPage', { artworks: artworks, artistName: artistName, user: user });
    } else {
      // If no artworks found, render the search page with a 'no results' flag
      res.render('searchArtists', { noResults: true, user: user });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while searching for the artist');
  }
});

// GET route for search form
app.get('/search-artists', (req, res) => {
  res.render('searchArtists');
});

//POST Route to Like an Artwork
app.post('/like-artwork', async (req, res) => {
  const artworkId = req.body.artworkId;
  const userId = req.session.userId;

  try {
    // Toggle like status
    const artwork = await Artwork.findById(artworkId);
    if (artwork.likes.includes(userId)) {
      // If already liked, unlike it
      await Artwork.findByIdAndUpdate(artworkId, {
        $pull: { likes: userId }
      });
    } else {
      // If not liked, add like
      await Artwork.findByIdAndUpdate(artworkId, {
        $addToSet: { likes: userId }
      });

      // Add notification
      await User.findByIdAndUpdate(userId, {
        $push: { notifications: { message: `You liked '${artwork.Title}'`, date: new Date() } }
      });
    }

    res.redirect('back');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while liking the artwork');
  }
});


// POST route to unlike an artwork
app.post('/unlike-artwork', async (req, res) => {
  const artworkId = req.body.artworkId;
  const userId = req.session.userId;

  try {
    // Remove the user's ID from the artwork's likes array
    await Artwork.findByIdAndUpdate(artworkId, {
      $pull: { likes: userId }
    });

    res.redirect('back');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while unliking the artwork');
  }
});

app.get('/artwork/:id', async (req, res) => {
  const artworkId = req.params.id;

  try {
      const artwork = await Artwork.findById(artworkId);
      if (!artwork) {
          return res.status(404).send('Artwork not found');
      }
      
      // Render an artwork detail page or handle this accordingly
      res.render('artworkDetail', { artwork: artwork });
  } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred while fetching the artwork');
  }
});

// POST Route to Submit a Review
app.post('/submit-review', async (req, res) => {
  const artworkId = req.body.artworkId;
  const reviewText = req.body.reviewText;
  const userId = req.session.userId;

  try {
    // Check if a review by this user for this artwork already exists
    const existingReview = await Artwork.findOne({ _id: artworkId, 'reviews.reviewer': userId });
    
    if (existingReview) {
      // Update the existing review
      await Artwork.updateOne(
        { _id: artworkId, 'reviews.reviewer': userId },
        { $set: { 'reviews.$.text': reviewText } }
      );
    } else {
      // Add a new review
      const review = { reviewer: userId, text: reviewText, date: new Date() };
      await Artwork.findByIdAndUpdate(artworkId, { $push: { reviews: review } });
    }

    req.flash('success', 'Review submitted successfully.');
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while submitting the review');
  }
});

//POST Route to Follow an Artist
app.post('/follow-artist', async (req, res) => {
  const artistName = req.body.artistName;
  const userId = req.session.userId;

  try {
    // Add the artist's name to the user's followedArtists array
    await User.findByIdAndUpdate(userId, {
      $addToSet: { followedArtists: artistName }
    });

    // Redirect to the dashboard instead of going 'back'
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).send('An error occurred while following the artist');
  }
});

// GET route for an artist's page
app.get('/artist/:artistName', async (req, res) => {
  const artistName = req.params.artistName.replace('-', ' ');

  try {
    const artworks = await Artwork.find({ Artist: new RegExp(artistName, 'i') });
    const user = await User.findById(req.session.userId); // Fetch the logged-in user

    if (artworks.length > 0) {
      res.render('artistPage', { artworks: artworks, artistName: artistName, user: user });
    } else {
      res.status(404).send('Artist not found');
    }
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// POST route to unfollow an artist
app.post('/unfollow-artist', async (req, res) => {
  const artistName = req.body.artistName; // Use the artist's name if it's stored as a string
  const userId = req.session.userId;

  try {
    // Update the User document by removing the artist's name from the followedArtists array
    await User.findByIdAndUpdate(userId, {
      $pull: { followedArtists: artistName }
    });

    // Redirect to the dashboard to reflect the change
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error); // Log the error for debugging purposes
    res.status(500).send('An error occurred while unfollowing the artist');
  }
});

app.get('/my-profile', async (req, res) => {
  if (!req.session.userId) {
    // If the user is not logged in, redirect to the login page
    return res.redirect('/login');
  }

  try {
    // Fetch the logged-in user's details from the database
    const user = await User.findById(req.session.userId);
    if (!user) {
      // If the user is not found, redirect to the login page
      res.redirect('/login');
    } else {
      // Render the 'myProfile' template with the user's details
      res.render('myProfile', { user: user });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while loading the profile');
  }
});

app.get('/logout', (req, res) => {
  const userId = req.session.userId;
  User.findByIdAndUpdate(userId, { activeSessionId: null }, () => {
    req.session.destroy(() => {
      res.redirect('/');
    });
  });
});


app.get('/update-account-information', async (req, res) => {
  if (!req.session.userId) {
      return res.redirect('/login');
  }

  try {
      const user = await User.findById(req.session.userId);
      if (user) {
          res.render('updateAccountInformation', { user });
      } else {
          res.redirect('/dashboard');
      }
  } catch (error) {
      res.status(500).send('Server error');
  }
});

app.post('/update-account-information', async (req, res) => {
  const userId = req.session.userId;
  const { downgradeAccount } = req.body;

  try {
    const user = await User.findById(userId);

    // Downgrade account if requested
    if (downgradeAccount === 'true') {
        user.isArtist = false;
    }

    await user.save();
    req.flash('success', 'Account information updated successfully.');
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while updating the account');
  }
});

// Route to search artwork by title
app.get('/search-artwork-title', (req, res) => {
  res.render('searchArtworkTitle'); // Render a new Pug template for title search
});

// Route to search artwork by category
app.get('/search-artwork-category', (req, res) => {
  res.render('searchArtworkCategory'); // Render a new Pug template for category search
});

// Route to handle search by artwork title
app.get('/perform-title-search', async (req, res) => {
  const titleQuery = req.query.title;
  try {
      const artworks = await Artwork.find({ Title: new RegExp(titleQuery, 'i') });
      res.render('searchResults', { artworks: artworks });
  } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred during the search');
  }
});

// Route to handle search by artwork category
app.get('/perform-category-search', async (req, res) => {
  const categoryQuery = req.query.category;
  try {
      const artworks = await Artwork.find({ Category: new RegExp(categoryQuery, 'i') });
      res.render('searchResults', { artworks: artworks });
  } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred during the search');
  }
});

  
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
