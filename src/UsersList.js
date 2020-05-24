// Displays list of users on the left
import React from "react";
import {
  Grid,
  Segment,
  Card,
  List,
  Button,
  Image,
  Modal,
  Header
} from "semantic-ui-react";

const pointers = {}
const platformPointer = "$coil.xrptipbot.com/da75ae04-5c0c-4662-8ce6-5470a4127d97"

class UsersList extends React.Component {
  componentDidMount() {
    document.monetization.addEventListener('monetizationprogress', this.handleMoney);
  }
  
  componentWillUnmount() {
    document.monetization.removeEventListener('monetizationprogress', this.handleMoney);
  }

  handleMoney (event) {
    const e = event.detail
    const scale = e.assetScale
    let total = pointers[e.paymentPointer]
    if (!total) total = 0
    const delta = (e.amount * Math.pow(10, -scale)) //.toFixed(scale)
    total += delta
    //console.log(total)
    pointers[e.paymentPointer] = total
  }

  render() {
    const { users, toggleConnection, connectedTo, connecting } = this.props
    const platform = pointers[platformPointer]
    const platformAmount = platform ? platform.toFixed(9) : 0
    //console.log(pointers)
    return (
    <Grid.Column width={5}>
      Platform ${platformAmount}
      <Card fluid>
        <Card.Content header="Online Users" />
        <Card.Content textAlign="left">
          {(users.length && (
            <List divided verticalAlign="middle" size="large">
              {users.map((user) => {
                //console.log(user)
                const userPaid = pointers[user.pointer]
                const userAmount = userPaid ? userPaid.toFixed(9) : 0
                return (
                <List.Item key={user.userName}>
                  <List.Content floated="right">
                    <Button
                      onClick={() => {
                        toggleConnection(user.userName);
                      }}
                      disabled={!!connectedTo && connectedTo !== user.userName}
                      loading={connectedTo === user.userName && connecting}
                    >
                      {connectedTo === user.userName ? "Disconnect" : "Connect"}
                    </Button>
                  </List.Content>
                  <Modal trigger={<Image avatar src={user.avatar} />}>
    <Modal.Header>A Money Chat User</Modal.Header>
    <Modal.Content image>
      <Image wrapped size='medium' src={user.avatar} />
      <Modal.Description>
        <Header>{user.userName}</Header>
        <p>
          Payment Pointer: {user.pointer}
        </p>
        <p>
          Amount you have paid to this user: {userAmount}
        </p>
        <p>
          {JSON.stringify(user,null,2)}
        </p>
      </Modal.Description>
    </Modal.Content>
  </Modal>
                  <List.Content>
                    <List.Header>{user.userName} ${userAmount}</List.Header>
                  </List.Content>
                </List.Item>
              )})
              }
            </List>
          )) || <Segment>There are no users Online</Segment>}
        </Card.Content>
      </Card>
    </Grid.Column>
  )
}
}

export default UsersList;
