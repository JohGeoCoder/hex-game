FROM golang:1.22-alpine3.19 as base

# System dependencies
RUN apk update && \
    apk add --no-cache ca-certificates tzdata git && \
    update-ca-certificates

# Install air and delve
RUN go install github.com/cosmtrek/air@v1.49.0 && go install github.com/go-delve/delve/cmd/dlv@v1.22.1

### Run the backend project
FROM base as backend
WORKDIR /hexgridgame/

# First copy just the go.mod/sum so we can just download the deps. 
# This means subsequent docker rebuilds, won't re-download/compile
# our dependencies unless they actually change in the go.mod/sum files.
COPY go.mod go.sum ./
RUN go mod download

# Copy in the source code and compile in debug mode.
COPY . .
# RUN go build -gcflags='all=-N -l' -o ./.air/hexgridgame .

EXPOSE 2345
EXPOSE 8080

# The build step of the project is completed in the commands executed in the .air.toml file
ENTRYPOINT ["air"]