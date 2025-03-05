import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Button,
  PermissionsAndroid,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import {RTCPeerConnection, RTCView, mediaDevices} from 'react-native-webrtc';

const configuration = {
  iceServers: [{urls: 'stun:stun.l.google.com:19302'}],
};

export default function VideoCall() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const peerConnection = useRef(null);
  const remotePeerConnection = useRef(null);

  async function requestPermissions() {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);

      if (
        granted[PermissionsAndroid.PERMISSIONS.CAMERA] !==
          PermissionsAndroid.RESULTS.GRANTED ||
        granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !==
          PermissionsAndroid.RESULTS.GRANTED
      ) {
        console.warn('not granted');
        return false;
      }
      return true;
    } catch (error) {
      console.warn('Error:', error);
      return false;
    }
  }

  async function getLocalStream() {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {facingMode: 'user'},
      });

      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error--', error);
      return null;
    }
  }

  function createPeerConnections() {
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    if (remotePeerConnection.current) {
      remotePeerConnection.current.close();
    }

    peerConnection.current = new RTCPeerConnection(configuration);
    remotePeerConnection.current = new RTCPeerConnection(configuration);

    peerConnection.current.onicecandidate = event => {
      if (event.candidate) {
        remotePeerConnection.current.addIceCandidate(event.candidate);
      }
    };
    remotePeerConnection.current.onicecandidate = event => {
      if (event.candidate) {
        peerConnection.current.addIceCandidate(event.candidate);
      }
    };

    remotePeerConnection.current.ontrack = event => {
      console.log('remote', event.streams[0]);
      setRemoteStream(event.streams[0]);
      setLoading(false);
    };
  }

  async function startCall() {
    if (!localStream) {
      console.warn('not available');
      return;
    }

    setCallActive(true);
    setLoading(true);

    createPeerConnections();

    localStream.getTracks().forEach(track => {
      peerConnection.current.addTrack(track, localStream);
    });

    try {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      setTimeout(() => simulateRemotePeer(offer), 2000);
    } catch (error) {
      console.error('Error=', error);
    }
  }

  async function simulateRemotePeer(offer) {
    if (!remotePeerConnection.current) return;

    try {
      await remotePeerConnection.current.setRemoteDescription(offer);

      if (localStream) {
        localStream.getTracks().forEach(track => {
          remotePeerConnection.current.addTrack(track, localStream);
        });
      }

      const answer = await remotePeerConnection.current.createAnswer();
      await remotePeerConnection.current.setLocalDescription(answer);
      await peerConnection.current.setRemoteDescription(answer);
    } catch (error) {
      console.error('Errors', error);
    }
  }

  function endCall() {
    setCallActive(false);
    setLoading(false);

    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (remotePeerConnection.current) {
      remotePeerConnection.current.close();
      remotePeerConnection.current = null;
    }
  }

  useEffect(() => {
    (async () => {
      const hasPermission = await requestPermissions();
      if (hasPermission) {
        await getLocalStream();
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      {localStream && (
        <RTCView streamURL={localStream.toURL()} style={styles.video} />
      )}
      {remoteStream ? (
        <RTCView streamURL={remoteStream.toURL()} style={styles.video} />
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00ff00" />
          <Text style={styles.loadingText}>Connecting...</Text>
        </View>
      ) : null}

      <View style={styles.buttonContainer}>
        {!callActive ? (
          <Button title="Start Call" onPress={startCall} color="#28a745" />
        ) : (
          <Button title="End Call" onPress={endCall} color="red" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: 300,
    marginBottom: 10,
    borderRadius: 10,
  },
  loadingContainer: {
    width: '90%',
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 10,
  },
  loadingText: {
    marginTop: 10,
    color: 'white',
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
});
