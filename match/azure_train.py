import json
from pymongo import *
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
from flask import Flask, redirect, url_for, request
app = Flask(__name__)
os.environ['FACE_SUBSCRIPTION_KEY'] = "a79298493a4443ed9972de106b4035c3"
os.environ['FACE_ENDPOINT'] = "https://findtheface.cognitiveservices.azure.com/"
client = MongoClient('mongodb://localhost:27017')
db = client.test

mycol = db["missing"]
KEY = os.environ['FACE_SUBSCRIPTION_KEY']
ENDPOINT = os.environ['FACE_ENDPOINT']

face_client = FaceClient(ENDPOINT, CognitiveServicesCredentials(KEY))
PERSON_GROUP_ID = 'my-unique-person-group6'
TARGET_PERSON_GROUP_ID = str(uuid.uuid4())


def train(personName):
    print('Person group:', PERSON_GROUP_ID)
    try:
        face_client.person_group.create(
            person_group_id=PERSON_GROUP_ID, name=PERSON_GROUP_ID)
    except:
        face_client.person_group.update(
            person_group_id=PERSON_GROUP_ID, name=PERSON_GROUP_ID)
    person = face_client.person_group_person.create(
        PERSON_GROUP_ID, personName)
    person_images = [file for file in glob.glob(
        "*.jpg") if file.startswith(personName.split()[0])]
    print(person_images)
    for image in person_images:
        w = open(image, 'r+b')
        face_client.person_group_person.add_face_from_stream(
            PERSON_GROUP_ID, person.person_id, w)
        print(person.person_id)

    print('Training the person group...')
    face_client.person_group.train(PERSON_GROUP_ID)
    mydict = {"name": personName, "azure_face_id": person.person_id, "photos" : person_images}
    x = mycol.insert_one(mydict)
    print(x.inserted_id)
    while (True):
        training_status = face_client.person_group.get_training_status(
            PERSON_GROUP_ID)
        print("Training status: {}.".format(training_status.status))
        print()
        if (training_status.status is TrainingStatusType.succeeded):
            break
        elif (training_status.status is TrainingStatusType.failed):
            sys.exit('Training the person group has failed.')
        time.sleep(5)


@app.route('/', methods=['POST', 'GET'])
def login():
    if request.method == 'POST':
        personName = request.form['name']
        train(personName)
        return {'status': True}
    else:
        personName = request.args.get('name')
        train(personName)
        return {'status': True}


if __name__ == '__main__':
    app.run(debug=True)
