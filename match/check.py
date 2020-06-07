from flask import Flask
from flask_restful import Resource, Api
import face_recognition
import pickle


app = Flask(__name__)

api = Api(app)






def getImageIDs():
	with open('dataset_faces.dat', 'rb') as f:
		known = pickle.load(f)
	f.close()
	image_IDs = []
	picture_of_me = face_recognition.load_image_file('me.jpg')
	my_face_encoding = face_recognition.face_encodings(picture_of_me)[0]

	for i in range(len(known)):
		if face_recognition.compare_faces([known[i]], my_face_encoding)[0]:
			print("Match found => k"+str(i+1))
			image_IDs.append("k"+str(i+1)+".jpg")
		else:
			print("Not matching")
	return image_IDs

# print(getImageIDs())

class HelloWorld(Resource):
	def get(self):
         return {'data': getImageIDs()}

api.add_resource(HelloWorld, '/')

if __name__ == '__main__':
    app.run(debug=True)
