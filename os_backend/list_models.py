import google.generativeai as genai

genai.configure(api_key="AIzaSyD3UhRC0DCF55aSg6ls-u5lpIDcInF_Nas")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(m.name)
