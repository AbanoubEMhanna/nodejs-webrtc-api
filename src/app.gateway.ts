import { IceCandidatePayload } from './ice-candidate.interface';
import { OfferAnswerPayload } from './offer-answer.payload.interface';
import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsResponse,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Server, } from 'socket.io';
import * as UsernameGenerator from 'username-generator'


@WebSocketGateway({ namespace: '/' })
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('AppGateway');
  private activeSockets = []
  private users = new Map()
  private otherUsers = new Map()


  @SubscribeMessage('msgToServer')
  handleMessage(socket: Socket, payload: string): WsResponse<string> {
    // this.server.emit('msgToClient', payload);
    return { event: "msgToClient", data: payload }
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket Init....');
  }

  handleDisconnect(socket: Socket) {
    this.logger.log(`Client disconnected: ${socket.id}`);
    this.activeSockets = this.activeSockets.filter(existingSocket => {
      return existingSocket.socketId !== socket.id
    });
    this.users.delete(socket['currentUserName']);
    console.log("AppGateway -> handleDisconnect -> existingSockets", this.activeSockets)
  }

  handleConnection(socket: Socket, ...args: any[]) {
    const currentUserName = UsernameGenerator.generateUsername("-")
    const userPayload = {
      socketId: socket.id,
      name: currentUserName
    }


    socket['currentUserName'] = currentUserName;

    console.log("ME NOW: ", socket.id)

    const existingUser = this.users.get(socket['currentUserName'])
    if (!existingUser) {
      this.otherUsers = this.users

      this.users.set(currentUserName, socket);

      socket.emit("users-list", Array.from(this.otherUsers.keys()));

      socket.broadcast.emit("users-list",
        Array.from(this.users.keys())
      );
    }


    socket.emit("conn-success", { socketId: socket.id, name: currentUserName })
    // when offer gets fired

    socket.on('chat-message', (payload: { from: string, name: string, message: string }) => {
      console.log("message -> payload", payload)
      const otherUser = this.users.get(payload.name)
      if (otherUser) {
        otherUser.emit('chat-message', payload);
      } else {
        socket.emit('user-status',"User offline")
      }
    });


    socket.on('offer', (payload: OfferAnswerPayload) => {
      console.log("OFFER -> payload", payload)
      const otherUser = this.users.get(payload.name)
      // console.log("AppGateway -> handleConnection -> otherUser", otherUser)
      if (otherUser) {
        otherUser.emit('offer', payload);
      } else {
        socket.emit("User offline")
      }


    });

    socket.on('answer', (payload: OfferAnswerPayload) => {
      console.log("OFFER -> payload", payload)
      const otherUser = this.users.get(payload.name)
      if (otherUser) {
        otherUser.emit('answer', payload);
      } else {
        socket.emit("User offline")
      }

    });

    socket.on('reject', (payload: { from: string, name: string, reject: boolean }) => {
      console.log("reject -> payload", payload)
      const otherUser = this.users.get(payload.name)
      if (otherUser) {
        otherUser.emit('reject', payload);
      } else {
        socket.emit('user-status',"User offline")
      }
    });

    socket.on('cancel', (payload: { from: string, name: string, cancel: boolean }) => {
      console.log("cancel -> payload", payload)
      const otherUser = this.users.get(payload.name)
      if (otherUser) {
        otherUser.emit('cancel', payload);
      } else {
        socket.emit('user-status',"User offline")
      }

    });


    socket.on('ice-candidate', (payload: IceCandidatePayload) => {
      const otherUser = this.users.get(payload.name)
      if (otherUser) {
        otherUser.emit('ice-candidate', payload);
      } else {
        socket.emit("User offline")
      }

    });


  }


}