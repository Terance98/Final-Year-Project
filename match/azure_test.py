import asyncio
import io
import glob
import os
import sys
import time
import uuid
import requests
from urllib.parse import urlparse
from io import BytesIO
from PIL import Image, ImageDraw
from azure.cognitiveservices.vision.face import FaceClient
from msrest.authentication import CognitiveServicesCredentials
from azure.cognitiveservices.vision.face.models import TrainingStatusType, Person, SnapshotObjectType, OperationStatusType
import json
from pymongo import MongoClient
from flask import Flask, redirect, url_for, request
app = Flask(__name__)

client = MongoClient('mongodb://localhost:27017')
db = client.test

mycol = db["missing"]
os.environ['FACE_SUBSCRIPTION_KEY'] = "a79298493a4443ed9972de106b4035c3"
os.environ['FACE_ENDPOINT'] = "https://childmissing.cognitiveservices.azure.com/"
PERSON_GROUP_ID = 'my-unique-person-group6'
KEY = os.environ['FACE_SUBSCRIPTION_KEY']
ENDPOINT = os.environ['FACE_ENDPOINT']
face_client = FaceClient(ENDPOINT, CognitiveServicesCredentials(KEY))


def identify():
    group_photo = 'suspicious.jpg'
    IMAGES_FOLDER = os.path.join(os.path.dirname(os.path.realpath(__file__)))
    test_image_array = glob.glob(os.path.join(IMAGES_FOLDER, group_photo))
    image = open(test_image_array[0], 'r+b')
    face_ids = []
    faces = face_client.face.detect_with_stream(image)
    for face in faces:
        face_ids.append(face.face_id)
    results = face_client.face.identify(face_ids, PERSON_GROUP_ID)
    identifed_person_ids = []
    confidence_dict = dict()
    print('Identifying faces in {}'.format(os.path.basename(image.name)))
    if len(results) == 0:
        print('No person identified in the person group for faces from {}.'.format(
            os.path.basename(image.name)))
    try:
        for person in results:
            identifed_person_ids.append(person.candidates[0].person_id)
            confidence_dict[person.candidates[0].person_id] = person.candidates[0].confidence
    except:
        print("nothing")
        return {'output': None}

    peopleList = []
    matchedPeople = mycol.find(
        {"azure_face_id": {"$in": identifed_person_ids}})
    for person in matchedPeople:
        print("Match found with {} at a confidence of {}".format(
            person['name'], confidence_dict[person['azure_face_id']]))
        peopleList.append(dict({
            'name': person['name'],
            'confidence_level': confidence_dict[person['azure_face_id']],
            'person_id': person['azure_face_id'],
            'photos':person['photos'],
            'fname':person['name'].split(" ")[0]
        }))

    return {'output': peopleList}


@app.route('/', methods=['POST', 'GET'])
def login():
    if request.method == 'POST':
        try:
            return identify()
        except:
            return {'output': []}
    else:
        return identify()

if __name__ == '__main__':
    app.run(debug=True, port=6000)
