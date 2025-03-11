
# specifies the base image for the Docker container.
FROM node:18-alpine

# This sets the working directory inside the container to /app. All subsequent commands (e.g., COPY, RUN, CMD) will be executed in this directory
WORKDIR /app

# This copies the package.json file from your local directory (where the Dockerfile is located) into the /app directory inside the container. 
COPY package.json .

RUN npm install

# This copies the rest of the files from your local directory (where the Dockerfile is located) into the /app directory inside the container

COPY . .

EXPOSE 3000

# This specifies the command to run when the container starts. In this case, it runs npm start
CMD ["npm", "start"]
