import React, 
  { Fragment, 
    useState, useEffect, useRef } from "react";
import {
  Header,
  Icon,
  Input,
  Grid,
  Segment,
  Button,
  Loader,
  Form,
  Label,
} from "semantic-ui-react";
import SweetAlert from "react-bootstrap-sweetalert";
import { format } from "date-fns";
import "./App.css";
import UsersList from "./UsersList";
import MessageBox from "./MessageBox";
import Paho from "paho-mqtt"
import MonetizationOff from './MonetizationOff'
//import MoneyViewer from "./MoneyViewer";

const platformPointer = "$coil.xrptipbot.com/da75ae04-5c0c-4662-8ce6-5470a4127d97"
// Use for local connections
const configuration = null;

const Chat = ({ connection, updateConnection, channel, updateChannel }) => {
  const [socketOpen, setSocketOpen] = useState(false);
  const [socketMessages, setSocketMessages] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [me, setMe] = useState("");
  const [paymentPointer, setPaymentPointer] = useState(platformPointer);
  const [loggingIn, setLoggingIn] = useState(false);
  const [users, setUsers] = useState([]);
  const [connectedTo, setConnectedTo] = useState("group");
  const [connecting, setConnecting] = useState(false);
  const [alert, setAlert] = useState(null);
  //const [activeItem, setActiveItem] = useState(null);
  const connectedRef = useRef();
  const [message, setMessage] = useState("");
  const messagesRef = useRef({});
  const [messages, setMessages] = useState({});

  const client = useRef(null)

  useEffect(() => {
    const clientID = "bot-demo-ws-" + parseInt(Math.random() * 100);
    const host = "mqtt.bitcoinofthings.com"
    const port = "8884"
    const isSSL = true
    const usessl = (isSSL && port === "8884")
    const username = "demo"
    const password = "demo"
    client.current = new Paho.Client(host, Number(port), clientID)
    // Set callback handlers
    //client.onConnectionLost = onConnectionLost
    client.current.onMessageArrived = onMessageArrived
    client.current.connect({ 
      useSSL: usessl,
      userName: username,
      password: password,
      onSuccess: onConnect
    })

  }, []);

  // Called when the client connects
function onConnect() {
  setSocketOpen(true);
  client.current.subscribe("demo");
  console.log("subscribed to demo topic")
}

// Called when a message arrives on mqtt topic
function onMessageArrived(message) {
  console.log("onMessageArrived: " + message.payloadString);
  const data = JSON.parse(message.payloadString)
  setSocketMessages(prev => [...prev, data])
}

  useEffect(() => {
    let data = socketMessages.pop();
    if (data) {
      console.log(data)
      switch (data.type) {
        case "connect":
          setSocketOpen(true);
          break
        case "login":
          // we sent the login message
          if (data.name === me) onLogin(data)
          else {
            // someone else logged in. add to our list of users
            updateUsersList(data.users[0])
            // broadcast ourselves so that new user sees us
            if (me) {
              send({ type: "updateUsers",
                key: me,
                userName: me,
                pointer: paymentPointer
              })
            }
          }
          break
        case "updateUsers":
          updateUsersList(data);
          break
        case "removeUser":
          removeUser(data)
          break
        case "offer":
          onOffer(data)
          break
        case "answer":
          if (!data.sender) {
            console.error('INVALID answer message')
          } else {
            onAnswer(data)
          }
          break
        case "candidate":
          onCandidate(data);
          break
        case "channelMessage":
          onChannelMessage(data);
          break
        default:
          console.log(`${data.type} type not handled in switch`)
          console.log(data)
          break
      }
    }
  }, [socketMessages]);

  const closeAlert = () => {
    setAlert(null);
  };

  const send = data => {
    client.current.publish("demo",JSON.stringify(data))
  }

  //was { data }
  const onChannelMessage = (data) => {
    handleDataChannelMessageReceived(data)
  }

  const handleLogin = () => {
    setLoggingIn(true);
    send({ type: "login",
      name: me,
      success: true,
      message:"I just logged in",
      users: [{key:me, userName: me, pointer: paymentPointer}]
    });
  };

  const updateUsersList = (user) => {
    removeUser(user)
    user.avatar = `https://avatars.dicebear.com/api/human/${user.userName}.svg`
    user.paidAmount = 0.00
    setUsers(prev => [...prev, user]);
  };

  const removeUser = (user) => {
    setUsers(prev => prev.filter(u => u.userName !== user.userName));
  }

  //message received from user in channel
  //group messages are also sent here
  const handleDataChannelMessageReceived = (data) => {
    const message = data
    const sender = message.sender
    const recipient = message.recipient
    if (!(recipient === me || sender === me)
    && recipient !== "group") return
    const peer = (sender === me || recipient === "group") 
    ? recipient 
    : sender
    let conversations = messagesRef.current
    let peerMessages = conversations[peer]
    console.log(peerMessages)
    if (peerMessages) {
      peerMessages = [...peerMessages, message]
      let newMessages = Object.assign({}, messages, { [peer]: peerMessages })
      messagesRef.current = newMessages
      setMessages(newMessages)
      console.log(newMessages)
    } else {
      peerMessages = { [peer]: [message] }
      let newMessages = Object.assign({}, messages, peerMessages)
      messagesRef.current = newMessages
      setMessages(newMessages)
    }
  }

  const onLogin = ({ success, message, users: loggedIn }) => {
    setLoggingIn(false)
    if (success) {
      setAlert(
        <SweetAlert
          success
          title={`Hello ${me}`}
          timeout={3000}
          onConfirm={closeAlert}
          onCancel={closeAlert}
        >
          Logged in successfully!
        </SweetAlert>
      )
      setIsLoggedIn(true)
      updateUsersList(loggedIn[0])

      let localConnection = new RTCPeerConnection(configuration);
      localConnection.ondatachannel = event => {
        console.log("Data channel is created!");
        let receiveChannel = event.channel;
        receiveChannel.onopen = () => {
          console.log("Data channel is open and ready to be used.");
        };
        receiveChannel.onmessage = handleDataChannelMessageReceived;
        updateChannel(receiveChannel);
      };
      updateConnection(localConnection);
    } else {
      setAlert(
        <SweetAlert
          warning
          confirmBtnBsStyle="danger"
          title="Failed"
          onConfirm={closeAlert}
          onCancel={closeAlert}
        >
          {message}
        </SweetAlert>
      );
    }
  };

  //when somebody wants to connect to us
  const onOffer = (offerMessage) => {
    if (offerMessage.peer !== me) return
    setConnectedTo(offerMessage.sender);
    connectedRef.current = offerMessage.sender;
    send({ type: "answer", 
      answer: connection.localDescription, 
      sender: me,
      pointer: paymentPointer,
      peer: offerMessage.sender 
    })
  }

  const payTo = (pointer) => {
    document.querySelector('meta[name="monetization"]').setAttribute("content", pointer)
    console.log(`Now paying to ${pointer}`)
}

  //when a peer answers our offer
  const onAnswer = (answer) => {
    if (answer.sender === me) {
      console.log(`You accepted the offer. Now connected to ${answer.peer}`)
      if (!answer.pointer) {
        console.error(`You not have a pointer.`)
      }
    }
    if (answer.peer === me) {
      console.log(`Your offer was accepted. You are now connected to ${answer.sender}`)
      if (answer.pointer) {
        payTo(answer.pointer)
      } else {
        console.error(`${answer.sender} does not have a pointer`)
      }
    }
  }

  const onCandidate = ({ candidate }) => {
    console.log('we dont do ice candidates')
  }

  //when a user clicks the send message button
  const sendMsg = () => {
    const time = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
    let connectedTo = connectedRef.current
    let messageEntity = { type:"channelMessage", time, message, 
      sender: me, recipient: connectedTo || "group" }
    send(messageEntity)
    setMessage("")
  };

  //connect to a peer with offer
  const handleConnectToPeer = peer => {
    let dataChannel = connection.createDataChannel("messenger");

    dataChannel.onerror = error => {
      setAlert(
        <SweetAlert
          warning
          confirmBtnBsStyle="danger"
          title="Failed"
          onConfirm={closeAlert}
          onCancel={closeAlert}
        >
          An error has occurred.
        </SweetAlert>
      );
    };

    dataChannel.onmessage = handleDataChannelMessageReceived;
    updateChannel(dataChannel);

    connection
      .createOffer()
      .then(offer => connection.setLocalDescription(offer))
      .then(() =>
        send({ type: "offer", offer: connection.localDescription, sender: me, peer })
      )
      .catch(e =>
        setAlert(
          <SweetAlert
            warning
            confirmBtnBsStyle="danger"
            title="Failed"
            onConfirm={closeAlert}
            onCancel={closeAlert}
          >
            An error has occurred.
          </SweetAlert>
        )
      )
  }

  const toggleConnectToPeer = userName => {
    if (connectedRef.current === userName) {
      setConnecting(true);
      setConnectedTo("group");
      payTo(platformPointer)
      connectedRef.current = "";
      setConnecting(false);
    } else {
      setConnecting(true);
      setConnectedTo(userName);
      connectedRef.current = userName;
      handleConnectToPeer(userName);
      setConnecting(false);
    }
  };

  return (
    <div className="App">
      <div className="align-left">
        <Icon name="github">
          <span style={{"margin":5}}>
          <a href="https://github.com/dfoderick/money-chat/" target="_blank" rel="noopener noreferrer">GitHub</a>
          </span>
        </Icon>
      </div>
      {alert}
      <Header as="h2" icon>
        <Icon name="users" />
        <a href="https://webmonetization.org/docs/getting-started.html" target="_blank" rel="noopener noreferrer">Web Monetization</a> Chat
      </Header>
      <MonetizationOff/>
      {(socketOpen && (
        <Fragment>
          <Grid centered columns={2}>
            <Grid.Column>
              {(!isLoggedIn && (
                <>
                <Form>
                <Form.Field>
                <Label pointing="below">Username is your chat alias (authentication not enabled yet)</Label>
                <Input icon='user' iconPosition='left'
                  disabled={loggingIn}
                  type="text"
                  onChange={e => setMe(e.target.value)}
                  placeholder="Username..."
                  action
                  autoFocus
                >
                </Input>
                </Form.Field>
                <Form.Field>
                <Label pointing="below"><a href="https://paymentpointers.org/" target="_blank" rel="noopener noreferrer">Payment Pointer</a> is your (optional) wallet address where you get paid when you chat. Default is platform for testing.</Label>
                <Input icon='dollar' iconPosition='left'
                  value = {paymentPointer}
                  disabled={loggingIn}
                  type="text"
                  onChange={e => setPaymentPointer(e.target.value)}
                  placeholder="Payment Pointer"
                  action
                >
                </Input>
                </Form.Field>
                <Button
                    color="teal"
                    disabled={!me || loggingIn}
                    onClick={handleLogin}
                  >
                    <Icon name="sign-in" />
                    Login
                  </Button>
                </Form>
                </>
              )) || (
                <Segment raised textAlign="center" color="olive">
                  Logged In as: {me} {paymentPointer}
                </Segment>
              )}
            </Grid.Column>
          </Grid>
          <Grid>
            <UsersList
              users={users}
              toggleConnection={toggleConnectToPeer}
              connectedTo={connectedTo}
              connection={connecting}
            />
            <MessageBox
              messages={messages}
              connectedTo={connectedTo}
              message={message}
              setMessage={setMessage}
              sendMsg={sendMsg}
              me={me}
            />
          </Grid>
        </Fragment>
      )) || (
        <Loader size="massive" active inline="centered">
          Connecting to messaging service...
        </Loader>
      )}
      {/* <MoneyViewer/> */}
    </div>
  );
};

export default Chat;
