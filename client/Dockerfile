# src/client/Dockerfile

# 1. Start with Node.js 20
FROM node:20

# 2. Set the working directory
WORKDIR /app

# 3. Copy the "shopping list"
COPY package*.json ./

# 4. Install all the Node modules
RUN npm install

# 5. Copy all our React app source code
COPY . .

# 6. Tell Docker the box will use port 5173
EXPOSE 5173

# 7. This is the command to run the dev server
CMD [ "npm", "run", "dev" ]