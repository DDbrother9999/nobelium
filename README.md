hi!

# If you're looking for how to contribute, reach out!

the basic flow is that I can generate keys for you and we'll have a development environment where it's very low-stakes

if you see a feature you think would be cool, make a pull request (don't know how to do this? reach out!)


tech stack

- mongodb atlas for article + general storage
- r2 object storage for images + other media
- firebase for google authentication

# To run this locally (suggestion):

reach out to me! I can generate api keys for everything for you and help with setup. Afterwards, you can run the application with ``npm run dev`` and ``pm2 start``

# To run this yourself independently:

1. Keys
- populate them yourself using MongoDB Atlas and Firebase for Google authentication and r2 cloudflare; see .example.env.dev for an example .env.dev

2. Run the application
- ``npm run build``
- ``pm2 start``
