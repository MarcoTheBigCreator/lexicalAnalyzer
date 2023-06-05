import fs from "fs";
import readline from "readline";
import { States, Finals } from "./table.js";

const wordsFile = "words.txt";
const typesFile = "types.txt";
const errorsFile = "error.txt";

// Create a readable stream to read the input file line by line
const readStream = fs.createReadStream(wordsFile, "utf8");

// Create a writable stream to write the results to the output file
const writeStream = fs.createWriteStream(typesFile, "utf8");

// Create a writable stream to write the results to the error file
const errorStream = fs.createWriteStream(errorsFile, "utf8");

// Create an interface to read lines from the input stream
const rl = readline.createInterface({
  input: readStream,
  crlfDelay: Infinity,
});

// Process each line of the input file
let lineCount = 0;
let current = "";
let state = 0;
let carry = false;
const rsl = [];

const analyzeChar = (char, position) => {
  const currState = States[state];
  let matched = false;
  if (currState.moves) {
    for (const key in currState.moves) {
      const compare = RegExp(key);
      console.log("Comparison -> ", compare, " to: <", char, ">");
      console.log("current token -> ", current);
      const match = char.match(compare);
      console.log("Matched? -> ", match);
      if (match) {
        if (currState.will === "carry") {
          carry = true;
        }
        state = currState.moves[key];
        matched = true;
        current = current + char;
        break;
      }
    }
  } else if (currState.will === "end") {
    rsl.push({ type: Finals[state], value: current });
    carry = false;
    matched = true;
    console.log("   final -> ", current);
    state = 0;
    current = "";
    return true;
  }
  if (!matched) {
    if (currState.will === "end") {
      if (currState.predates) {
        if (Finals[currState.predates] === rsl[rsl.length - 1].type) {
          rsl.pop();
        }
      }
      rsl.push({ type: Finals[state], value: current });
      carry = false;
      matched = true;
      console.log("--> final -> ", current);
      state = 0;
      current = "";
      return true;
    } else {
      throw new Error(`Invalid character: ${char}, at position ${position}`);
    }
  }
};

rl.on("line", (line) => {
  try {
    const chars = line.split("");
    console.log(chars, chars.length);
    for (let index = 0; index <= chars.length; index++) {
      let char;
      if (index < chars.length) {
        char = chars[index];
      } else {
        char = " ";
      }
      const pos = index + 1;
      console.log("   State -> ", state, " - Pos -> ", index);
      const n = analyzeChar(char, pos);
      if (n) {
        index--;
      }
    }
    lineCount++;
    // Write the results to the output file
    writeStream.write(
      rsl.map((token) => JSON.stringify(token)).join("\n") + "\n"
    );
  } catch (error) {
    lineCount++;
    // writes correct ones
    if (rsl) {
      writeStream.write(
        rsl.map((token) => JSON.stringify(token)).join("\n") + "\n"
      );
    }
    // writes error
    errorStream.write("Error on line " + lineCount + " -> " + error);
    console.error("Error on line " + lineCount + " -> " + error);
  }
});

// Close the write stream when all lines have been processed
rl.on("close", () => {
  if (carry) {
    console.error(
      "Error on line " + lineCount + " -> " + current + " was not closed"
    );
    errorStream.write(
      "Error on line " + lineCount + " -> " + current + " was not closed"
    );
  }
  console.log(rsl);
  console.log("Finished");
  writeStream.end();
  errorStream.end();
});
