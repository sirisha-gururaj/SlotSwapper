# src/server/Dockerfile

# 1. Start with an official "ingredient": Node.js version 20
FROM node:20

# 2. Set the "kitchen" (working directory) inside the container
WORKDIR /app

# 3. Copy just the "shopping list" first
COPY package*.json ./

# 4. Run "npm install" to get all the Node modules
# This is done separately so Docker can cache it
RUN npm install

# 5. Now, copy all of our app's source code into the box
COPY . .

# 6. Tell Docker the box will use port 4000
EXPOSE 4000

# 7. This is the command to run when the box is "heated up"
# Rebuild native modules (like sqlite3/bcrypt) to match the container's OS, then start
CMD npm rebuild && npm start