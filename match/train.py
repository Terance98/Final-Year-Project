import face_recognition, glob, pickle, time

known=[]
mylist = [image for image in glob.glob("../uploads/*.jpg")]

try:
  with open('dataset_faces.dat', 'rb') as f:
    known=pickle.load(f)
except:
  f = open("dataset_faces.dat", 'x')
  f.close()

itemCount=len(known)+1
print("No.of items: "+str(itemCount-1))

while (True):
 image='../uploads/k'+str(itemCount)+'.jpg'
 if image in mylist:
  photo = face_recognition.load_image_file(image)
  known.append(face_recognition.face_encodings(photo)[0])
  with open('dataset_faces.dat', 'wb') as f:
    pickle.dump(known, f)
  print("Trained: "+ image)
  itemCount=itemCount+1

 else:
  time.sleep(2)
  mylist = [f for f in glob.glob("../uploads/*.jpg")]
  with open('dataset_faces.dat', 'rb') as f:
    known = pickle.load(f)
  itemCount=len(known)+1

     
  

