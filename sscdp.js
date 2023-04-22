import React, { useState } from "react";
import "./home.styles.css";
import { Grid, TextField, Button, Container } from "@material-ui/core";

const Home = () => {
  const [input1, setInput1] = useState("");
  const [input2, setInput2] = useState("");
  const [input3, setInput3] = useState("");
  const [input4, setInput4] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log(input1, input2, input3, input4);
  };

  const handleUpload = () => {
    console.log("Upload clicked");
  };

  const handleDownload = () => {
    console.log("Download clicked");
  };

  // componentWillMount() {
  // };

  return (
    <Container maxWidth="md">
      <Grid spacing={6} alignItems="center" style={{ height: "90%" }}>
        <Grid item xs={12} sm={12} md={12} spacing={2}>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Dataset Name"
              value={input1}
              onChange={(e) => setInput1(e.target.value)}
              fullWidth
              margin="normal"
              id="outlined-basic"
              variant="outlined"
              color="secondary"
            />
            <TextField
              label="File Name"
              value={input2}
              onChange={(e) => setInput2(e.target.value)}
              fullWidth
              margin="normal"
              id="outlined-basic"
              variant="outlined"
              color="secondary"
            />
            <TextField
              label="File Type"
              value={input3}
              onChange={(e) => setInput3(e.target.value)}
              fullWidth
              margin="normal"
              id="outlined-basic"
              variant="outlined"
              color="secondary"
            />
            <TextField
              label="File Path"
              value={input4}
              onChange={(e) => setInput4(e.target.value)}
              fullWidth
              margin="normal"
              id="outlined-basic"
              variant="outlined"
              color="secondary"
            />
            <Button
              style={{
                background: "#fe3b21",
                marginTop: "1rem",
                color: "white",
                fontWeight: "bold",
              }}
              type="submit"
              variant="contained"
              fullWidth
              size="large"
            >
              Submit
            </Button>
          </form>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Home;

//post call with fetch
const handleSubmit = (event) => {
  event.preventDefault();
  const data = { input1, input2, input3, input4 }; // create an object with input values
  fetch('https://example.com/endpoint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data) // convert object to JSON string
  })
  .then(response => {
    console.log('Success:', response);
  })
  .catch(error => {
    console.error('Error:', error);
  });
};


//post call with axios
import axios from 'axios';

const handleSubmit = (event) => {
  event.preventDefault();
  const data = { input1, input2, input3, input4 }; // create an object with input values
  axios.post('https://example.com/endpoint', data)
    .then((response) => {
      console.log(response);
    })
    .catch((error) => {
      console.log(error);
    });
};

