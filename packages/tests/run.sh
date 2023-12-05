echo "test file" $1
echo "report file" $2

mocha --config packages/tests/.mocharc.json --reporter mochawesome --reporter-options reportFilename=$2,quiet=true $1